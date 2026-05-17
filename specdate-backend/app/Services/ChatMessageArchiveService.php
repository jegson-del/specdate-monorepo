<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\ChatMessageArchive;
use App\Models\ChatThread;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ChatMessageArchiveService
{
    public function __construct(private BlockService $blockService)
    {
    }

    public function dryRun(?int $days = null): array
    {
        $cutoff = now()->subDays($this->archiveDays($days));
        $query = $this->eligibleMessagesQuery($cutoff);

        return [
            'cutoff' => $cutoff,
            'message_count' => (clone $query)->count(),
            'thread_count' => (clone $query)->distinct('chat_thread_id')->count('chat_thread_id'),
        ];
    }

    public function listArchives(User $user, int $threadId): array
    {
        $thread = ChatThread::findOrFail($threadId);
        $this->authorizeThread($thread, $user);
        $this->authorizeNotBlocked($thread);

        return $thread->messageArchives()
            ->where('status', 'stored')
            ->orderByDesc('to_message_id')
            ->get()
            ->map(fn (ChatMessageArchive $archive) => $this->archivePayload($archive))
            ->values()
            ->all();
    }

    public function getArchive(User $user, int $threadId, int $archiveId): array
    {
        $thread = ChatThread::findOrFail($threadId);
        $this->authorizeThread($thread, $user);
        $this->authorizeNotBlocked($thread);

        $archive = $thread->messageArchives()
            ->where('status', 'stored')
            ->findOrFail($archiveId);

        $content = Storage::disk($archive->disk)->get($archive->path);
        if (! is_string($content) || hash('sha256', $content) !== $archive->checksum) {
            throw new HttpException(409, 'Chat archive checksum verification failed.');
        }

        return [
            'archive' => $this->archivePayload($archive),
            'messages' => $this->parseJsonlMessages($content),
        ];
    }

    public function archiveOldMessages(?int $days = null, ?int $chunk = null, ?string $disk = null): array
    {
        $cutoff = now()->subDays($this->archiveDays($days));
        $chunkSize = $this->chunkSize($chunk);
        $diskName = $disk ?: (string) config('chat_archive.disk', 's3');

        $result = [
            'cutoff' => $cutoff,
            'archives_created' => 0,
            'messages_archived' => 0,
            'failed_chunks' => 0,
        ];

        $this->eligibleMessagesQuery($cutoff)
            ->with(['sender:id,name,username', 'media'])
            ->orderBy('id')
            ->chunkById($chunkSize, function ($messages) use (&$result, $diskName) {
                $messages
                    ->groupBy('chat_thread_id')
                    ->each(function (Collection $threadMessages, $threadId) use (&$result, $diskName) {
                        try {
                            $archive = $this->archiveMessageChunk((int) $threadId, $threadMessages, $diskName);
                            $result['archives_created']++;
                            $result['messages_archived'] += (int) $archive->message_count;
                        } catch (RuntimeException) {
                            $result['failed_chunks']++;
                        }
                    });
            });

        return $result;
    }

    private function eligibleMessagesQuery($cutoff): Builder
    {
        return ChatMessage::query()
            ->where('created_at', '<', $cutoff)
            ->whereNull('hidden_at')
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('reports')
                    ->where('target_type', 'message')
                    ->whereColumn('target_id', 'chat_messages.id');
            })
            ->where(function ($query) {
                $query->whereNull('media_id')
                    ->orWhereNotExists(function ($mediaReportQuery) {
                        $mediaReportQuery->selectRaw('1')
                            ->from('reports')
                            ->where('target_type', 'media')
                            ->whereColumn('target_id', 'chat_messages.media_id');
                    });
            });
    }

    private function archiveMessageChunk(int $threadId, Collection $messages, string $disk): ChatMessageArchive
    {
        $messages = $messages->sortBy('id')->values();
        if ($messages->isEmpty()) {
            throw new RuntimeException('No messages to archive.');
        }

        $content = $this->serializeMessages($messages);
        $checksum = hash('sha256', $content);
        $fromMessage = $messages->first();
        $toMessage = $messages->last();
        $path = $this->archivePath($threadId, (int) $fromMessage->id, (int) $toMessage->id);

        if (! Storage::disk($disk)->put($path, $content)) {
            throw new RuntimeException("Could not write chat archive to {$disk}:{$path}");
        }

        return DB::transaction(function () use ($messages, $threadId, $fromMessage, $toMessage, $disk, $path, $checksum) {
            $archive = ChatMessageArchive::create([
                'chat_thread_id' => $threadId,
                'from_message_id' => $fromMessage->id,
                'to_message_id' => $toMessage->id,
                'from_sent_at' => $fromMessage->created_at,
                'to_sent_at' => $toMessage->created_at,
                'message_count' => $messages->count(),
                'disk' => $disk,
                'path' => $path,
                'checksum' => $checksum,
                'status' => 'stored',
                'stored_at' => now(),
            ]);

            ChatMessage::whereIn('id', $messages->pluck('id')->all())->delete();
            $this->refreshThreadLastMessage($threadId);

            return $archive;
        });
    }

    private function serializeMessages(Collection $messages): string
    {
        return $messages
            ->map(function (ChatMessage $message) {
                return json_encode([
                    'id' => $message->id,
                    'chat_thread_id' => $message->chat_thread_id,
                    'sender_id' => $message->sender_id,
                    'body' => $message->body,
                    'media_id' => $message->media_id,
                    'media' => $message->media ? [
                        'id' => $message->media->id,
                        'file_path' => $message->media->file_path,
                        'url' => $message->media->url,
                        'type' => $message->media->type,
                        'mime_type' => $message->media->mime_type,
                        'size' => $message->media->size,
                    ] : null,
                    'read_at' => $message->read_at?->toJSON(),
                    'created_at' => $message->created_at?->toJSON(),
                    'sender' => $message->sender ? [
                        'id' => $message->sender->id,
                        'name' => $message->sender->name,
                        'username' => $message->sender->username,
                    ] : null,
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            })
            ->implode("\n")."\n";
    }

    private function parseJsonlMessages(string $content): array
    {
        return collect(preg_split('/\r\n|\r|\n/', trim($content)))
            ->filter()
            ->map(function (string $line) {
                $payload = json_decode($line, true);
                if (! is_array($payload)) {
                    throw new HttpException(409, 'Chat archive contains invalid message data.');
                }

                return array_merge($payload, ['archived' => true]);
            })
            ->values()
            ->all();
    }

    private function archivePayload(ChatMessageArchive $archive): array
    {
        return [
            'id' => $archive->id,
            'chat_thread_id' => $archive->chat_thread_id,
            'from_message_id' => $archive->from_message_id,
            'to_message_id' => $archive->to_message_id,
            'from_sent_at' => $archive->from_sent_at,
            'to_sent_at' => $archive->to_sent_at,
            'message_count' => $archive->message_count,
            'status' => $archive->status,
            'stored_at' => $archive->stored_at,
        ];
    }

    private function archivePath(int $threadId, int $fromMessageId, int $toMessageId): string
    {
        return sprintf(
            'chat-archives/thread-%d/%s/messages-%d-%d-%s.jsonl',
            $threadId,
            now()->format('Y/m/d'),
            $fromMessageId,
            $toMessageId,
            now()->format('YmdHis')
        );
    }

    private function refreshThreadLastMessage(int $threadId): void
    {
        $thread = ChatThread::find($threadId);
        if (! $thread) {
            return;
        }

        $lastMessage = $thread->messages()
            ->whereNull('hidden_at')
            ->latest('id')
            ->first();

        $thread->update([
            'last_message_id' => $lastMessage?->id,
            'last_message_at' => $lastMessage?->created_at,
        ]);
    }

    private function archiveDays(?int $days): int
    {
        $configured = $days ?: (int) config('chat_archive.days', 30);
        $minimum = max(1, (int) config('chat_archive.min_days', 7));

        return max($minimum, $configured);
    }

    private function chunkSize(?int $chunk): int
    {
        $configured = $chunk ?: (int) config('chat_archive.chunk', 500);

        return min(max(50, $configured), 1000);
    }

    private function authorizeThread(ChatThread $thread, User $user): void
    {
        if (! $thread->hasParticipant((int) $user->id)) {
            throw new HttpException(403, 'You are not part of this chat.');
        }
    }

    private function authorizeNotBlocked(ChatThread $thread): void
    {
        if ($this->blockService->hasBlockBetween((int) $thread->owner_id, (int) $thread->winner_user_id)) {
            throw new HttpException(403, 'This chat is unavailable because one of you blocked the other user.');
        }
    }
}
