<?php

namespace App\Console\Commands;

use App\Models\ChatMessage;
use App\Models\ChatThread;
use App\Models\Media;
use App\Models\Report;
use App\Services\MediaService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PruneOldChatMessages extends Command
{
    protected $signature = 'chats:prune-old-messages
        {--days=180 : Delete unreported chat messages older than this many days}
        {--orphan-days=7 : Delete unattached chat media older than this many days}
        {--chunk=500 : Number of messages to process per batch}
        {--dry-run : Count eligible rows without deleting them}';

    protected $description = 'Prune old unreported chat messages and orphaned chat media to control storage growth.';

    public function handle(MediaService $mediaService): int
    {
        $days = max(30, (int) $this->option('days'));
        $orphanDays = max(1, (int) $this->option('orphan-days'));
        $chunk = min(max(50, (int) $this->option('chunk')), 1000);
        $dryRun = (bool) $this->option('dry-run');
        $cutoff = now()->subDays($days);
        $orphanCutoff = now()->subDays($orphanDays);

        $baseQuery = ChatMessage::query()
            ->where('created_at', '<', $cutoff)
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

        if ($dryRun) {
            $orphanCount = $this->orphanedChatMediaQuery($orphanCutoff)->count();
            $this->info(sprintf(
                '%d old unreported chat messages are eligible for pruning before %s.',
                (clone $baseQuery)->count(),
                $cutoff->toDateTimeString()
            ));
            $this->info(sprintf(
                '%d unattached chat media files are eligible for pruning before %s.',
                $orphanCount,
                $orphanCutoff->toDateTimeString()
            ));
            return self::SUCCESS;
        }

        $deletedMessages = 0;
        $deletedMedia = 0;
        $affectedThreadIds = [];

        (clone $baseQuery)
            ->with('media')
            ->orderBy('id')
            ->chunkById($chunk, function ($messages) use ($mediaService, &$deletedMessages, &$deletedMedia, &$affectedThreadIds) {
                $messageIds = $messages->pluck('id')->all();
                $media = $messages
                    ->pluck('media')
                    ->filter(fn (?Media $item) => $item && in_array($item->type, ['chat', 'chat_image', 'chat_video', 'chat_audio'], true))
                    ->unique('id')
                    ->values();

                foreach ($messages as $message) {
                    $affectedThreadIds[(int) $message->chat_thread_id] = true;
                }

                DB::transaction(function () use ($messageIds, $media, $mediaService, &$deletedMessages, &$deletedMedia) {
                    $deletedMessages += ChatMessage::whereIn('id', $messageIds)->delete();

                    foreach ($media as $item) {
                        $stillReferenced = ChatMessage::where('media_id', $item->id)->exists();
                        $isReported = Report::where('target_type', 'media')->where('target_id', $item->id)->exists();
                        if (!$stillReferenced && !$isReported && $mediaService->deleteMedia($item)) {
                            $deletedMedia++;
                        }
                    }
                });
            });

        $this->refreshThreadLastMessages(array_keys($affectedThreadIds));
        $deletedMedia += $this->deleteOrphanedChatMedia($mediaService, $orphanCutoff, $chunk);

        $this->info("Pruned {$deletedMessages} chat messages and {$deletedMedia} chat media files.");

        return self::SUCCESS;
    }

    private function refreshThreadLastMessages(array $threadIds): void
    {
        if (!$threadIds) {
            return;
        }

        ChatThread::whereIn('id', $threadIds)->chunkById(100, function ($threads) {
            foreach ($threads as $thread) {
                $lastMessage = $thread->messages()
                    ->whereNull('hidden_at')
                    ->latest('id')
                    ->first();

                $thread->update([
                    'last_message_id' => $lastMessage?->id,
                    'last_message_at' => $lastMessage?->created_at,
                ]);
            }
        });
    }

    private function deleteOrphanedChatMedia(MediaService $mediaService, $orphanCutoff, int $chunk): int
    {
        $deleted = 0;

        $this->orphanedChatMediaQuery($orphanCutoff)
            ->orderBy('id')
            ->chunkById($chunk, function ($mediaItems) use ($mediaService, &$deleted) {
                foreach ($mediaItems as $media) {
                    if ($mediaService->deleteMedia($media)) {
                        $deleted++;
                    }
                }
            });

        return $deleted;
    }

    private function orphanedChatMediaQuery($orphanCutoff)
    {
        return Media::query()
            ->whereIn('type', ['chat', 'chat_image', 'chat_video', 'chat_audio'])
            ->where('created_at', '<', $orphanCutoff)
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('chat_messages')
                    ->whereColumn('media_id', 'media.id');
            })
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('reports')
                    ->where('target_type', 'media')
                    ->whereColumn('target_id', 'media.id');
            });
    }
}
