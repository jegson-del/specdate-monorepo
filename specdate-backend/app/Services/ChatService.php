<?php

namespace App\Services;

use App\Events\MessageSent;
use App\Models\ChatMessage;
use App\Models\ChatThread;
use App\Models\Media;
use App\Models\SpecDate;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ChatService
{
    public function __construct(
        private NotificationService $notificationService,
        private BlockService $blockService,
        private MediaAttachmentPolicyService $mediaAttachmentPolicy,
    ) {}

    public function ensureThreadForDate(SpecDate $date): ChatThread
    {
        return ChatThread::firstOrCreate(
            ['spec_date_id' => $date->id],
            [
                'type' => 'match',
                'spec_id' => $date->spec_id,
                'owner_id' => $date->owner_id,
                'winner_user_id' => $date->winner_user_id,
            ]
        );
    }

    public function ensureThreadForProvider(User $customer, int $providerId): ChatThread
    {
        $provider = User::where('role', 'provider')->findOrFail($providerId);

        if ((int) $customer->id === (int) $provider->id) {
            throw new HttpException(422, 'You cannot message yourself as a provider.');
        }

        if ($this->blockService->hasBlockBetween((int) $customer->id, (int) $provider->id)) {
            throw new HttpException(403, 'This chat is unavailable because one of you blocked the other user.');
        }

        return ChatThread::firstOrCreate(
            [
                'type' => 'provider',
                'customer_id' => $customer->id,
                'provider_id' => $provider->id,
            ],
            [
                'owner_id' => $customer->id,
                'winner_user_id' => $provider->id,
            ]
        );
    }

    public function listThreads(User $user, int $perPage = 50, int $page = 1): array
    {
        $perPage = min(max($perPage, 1), 100);
        $page = max($page, 1);

        $threads = ChatThread::query()
            ->where(fn ($q) => $q->where('owner_id', $user->id)->orWhere('winner_user_id', $user->id))
            ->whereDoesntHave('owner.blockedUsers', fn ($q) => $q->where('blocked_id', $user->id))
            ->whereDoesntHave('winner.blockedUsers', fn ($q) => $q->where('blocked_id', $user->id))
            ->whereDoesntHave('owner.blockedByUsers', fn ($q) => $q->where('blocker_id', $user->id))
            ->whereDoesntHave('winner.blockedByUsers', fn ($q) => $q->where('blocker_id', $user->id))
            ->with([
                'spec:id,title,location_city',
                'specDate:id,date_code,created_at',
                'owner:id,name,username',
                'owner.profile',
                'owner.media',
                'winner:id,name,username',
                'winner.profile',
                'winner.media',
                'customer:id,name,username',
                'provider:id,name,username',
                'lastMessage.sender:id,name,username',
            ])
            ->withCount(['messages as unread_count' => function ($q) use ($user) {
                $q->where('sender_id', '!=', $user->id)->whereNull('read_at')->whereNull('hidden_at');
            }])
            ->orderByDesc(DB::raw('COALESCE(last_message_at, created_at)'))
            ->paginate($perPage, ['*'], 'page', $page);

        return [
            'data' => $threads->getCollection()
                ->map(fn (ChatThread $thread) => $this->threadPayload($thread, $user))
                ->values(),
            'current_page' => $threads->currentPage(),
            'last_page' => $threads->lastPage(),
            'per_page' => $threads->perPage(),
            'total' => $threads->total(),
        ];
    }

    public function getThread(User $user, int $threadId, int $perPage = 25, ?int $beforeId = null): array
    {
        $thread = $this->findThreadWithParticipants($threadId);

        $this->authorizeThread($thread, $user);
        $this->authorizeNotBlocked($thread);

        $perPage = min(max($perPage, 1), 50);
        $messageQuery = $thread->messages()
            ->with('sender:id,name,username', 'sender.profile', 'sender.media', 'media')
            ->whereNull('hidden_at');

        if ($beforeId) {
            $messageQuery->where('id', '<', $beforeId);
        }

        $fetched = $messageQuery
            ->orderByDesc('id')
            ->limit($perPage + 1)
            ->get();

        $hasMore = $fetched->count() > $perPage;
        $messages = $fetched
            ->take($perPage)
            ->sortBy('id')
            ->values()
            ->map(fn (ChatMessage $message) => $this->messagePayload($message));

        return [
            'thread' => $this->threadPayload($thread, $user),
            'messages' => $messages,
            'pagination' => [
                'per_page' => $perPage,
                'has_more' => $hasMore,
                'next_before_id' => $messages->first()['id'] ?? null,
            ],
        ];
    }

    public function getThreadOverview(User $user, int $threadId): array
    {
        $thread = $this->findThreadWithParticipants($threadId);

        $this->authorizeThread($thread, $user);
        $this->authorizeNotBlocked($thread);

        return $this->threadPayload($thread, $user);
    }

    public function sendMessage(User $user, int $threadId, ?string $body, $mediaId = null): ChatMessage
    {
        $thread = ChatThread::findOrFail($threadId);
        $this->authorizeThread($thread, $user);
        $this->authorizeNotBlocked($thread);

        $body = $body !== null ? trim($body) : null;
        if (($body === null || $body === '') && !$mediaId) {
            throw new HttpException(422, 'Message text or media is required.');
        }
        if ($body !== null && mb_strlen($body) > 2000) {
            throw new HttpException(422, 'Messages must be 2,000 characters or less.');
        }

        if ($mediaId) {
            $media = Media::where('id', $mediaId)
                ->where('user_id', $user->id)
                ->whereIn('type', ['chat', 'chat_image', 'chat_video', 'chat_audio'])
                ->whereNull('hidden_at')
                ->first();
            if (!$media) {
                throw new HttpException(422, 'Chat media not found.');
            }
            if (! $this->mediaAttachmentPolicy->canAttach($media)) {
                throw new HttpException(422, $this->mediaAttachmentPolicy->blockedMessage());
            }
        }

        $message = DB::transaction(function () use ($thread, $user, $body, $mediaId) {
            $message = $thread->messages()->create([
                'sender_id' => $user->id,
                'body' => $body,
                'media_id' => $mediaId,
            ]);

            $thread->update([
                'last_message_id' => $message->id,
                'last_message_at' => $message->created_at,
            ]);

            return $message;
        });

        $message->load('sender.profile', 'sender.media', 'media', 'thread.spec');
        MessageSent::dispatch($message);

        $recipientId = $thread->otherParticipantId((int) $user->id);
        $recipient = User::find($recipientId);
        if ($recipient) {
            $senderName = $user->profile?->full_name ?? $user->name ?? 'Your match';
            $this->notificationService->notify(
                $recipient,
                'chat_message',
                [
                    'thread_id' => $thread->id,
                    'thread_type' => $thread->type ?? 'match',
                    'spec_date_id' => $thread->spec_date_id,
                    'sender_id' => $user->id,
                ],
                'New message',
                "{$senderName} sent you a message."
            );
        }

        return $message;
    }

    public function markThreadRead(User $user, int $threadId): void
    {
        $thread = ChatThread::findOrFail($threadId);
        $this->authorizeThread($thread, $user);

        $thread->messages()
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->whereNull('hidden_at')
            ->update(['read_at' => now()]);
    }

    public function userCanAccessThread(User $user, int $threadId): bool
    {
        $thread = ChatThread::find($threadId);
        return $thread ? $thread->hasParticipant((int) $user->id) : false;
    }

    private function authorizeThread(ChatThread $thread, User $user): void
    {
        if (!$thread->hasParticipant((int) $user->id)) {
            throw new HttpException(403, 'You are not part of this chat.');
        }
    }

    private function findThreadWithParticipants(int $threadId): ChatThread
    {
        return ChatThread::with([
            'spec:id,title,location_city',
            'specDate:id,date_code,created_at',
            'owner:id,name,username',
            'owner.profile',
            'owner.media',
            'winner:id,name,username',
            'winner.profile',
            'winner.media',
            'customer:id,name,username',
            'provider:id,name,username',
        ])->findOrFail($threadId);
    }

    private function authorizeNotBlocked(ChatThread $thread): void
    {
        if ($this->blockService->hasBlockBetween((int) $thread->owner_id, (int) $thread->winner_user_id)) {
            throw new HttpException(403, 'This chat is unavailable because one of you blocked the other user.');
        }
    }

    private function threadPayload(ChatThread $thread, User $user): array
    {
        $owner = $thread->owner;
        $winner = $thread->winner;
        $other = (int) $thread->owner_id === (int) $user->id ? $winner : $owner;
        $otherAvatar = $other?->media?->where('type', 'avatar')->filter(fn ($media) => $media->isShareable())->sortByDesc('id')->first()?->url;

        return [
            'id' => $thread->id,
            'type' => $thread->type ?? 'match',
            'spec_date_id' => $thread->spec_date_id,
            'spec_id' => $thread->spec_id,
            'customer_id' => $thread->customer_id,
            'provider_id' => $thread->provider_id,
            'date_code' => $thread->specDate?->date_code,
            'spec' => $thread->spec,
            'other_user' => $other ? [
                'id' => $other->id,
                'name' => $other->profile?->full_name ?? $other->name,
                'username' => $other->username,
                'avatar' => $otherAvatar,
            ] : null,
            'last_message' => ($thread->lastMessage && !$thread->lastMessage->hidden_at) ? [
                'id' => $thread->lastMessage->id,
                'body' => $thread->lastMessage->body,
                'sender_id' => $thread->lastMessage->sender_id,
                'created_at' => $thread->lastMessage->created_at,
            ] : null,
            'last_message_at' => $thread->last_message_at,
            'unread_count' => $thread->unread_count ?? 0,
            'created_at' => $thread->created_at,
        ];
    }

    public function messagePayload(ChatMessage $message): array
    {
        $sender = $message->sender;
        $senderAvatar = $sender?->media?->where('type', 'avatar')->filter(fn ($media) => $media->isShareable())->sortByDesc('id')->first()?->url;

        return [
            'id' => $message->id,
            'chat_thread_id' => $message->chat_thread_id,
            'sender_id' => $message->sender_id,
            'body' => $message->body,
            'media' => $message->media
                && ! $message->media->hidden_at
                && $this->mediaAttachmentPolicy->canAttach($message->media)
                    ? $message->media
                    : null,
            'read_at' => $message->read_at,
            'created_at' => $message->created_at,
            'sender' => $sender ? [
                'id' => $sender->id,
                'name' => $sender->profile?->full_name ?? $sender->name,
                'username' => $sender->username,
                'avatar' => $senderAvatar,
            ] : null,
        ];
    }
}
