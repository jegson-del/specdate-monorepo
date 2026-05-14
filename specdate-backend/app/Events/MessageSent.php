<?php

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $message;
    public int $threadId;

    public function __construct(ChatMessage $message)
    {
        $message->loadMissing('sender.profile', 'sender.media', 'media');
        $sender = $message->sender;
        $senderAvatar = $sender?->media?->where('type', 'avatar')->filter(fn ($media) => $media->isShareable())->sortByDesc('id')->first()?->url;
        $this->message = [
            'id' => $message->id,
            'chat_thread_id' => $message->chat_thread_id,
            'sender_id' => $message->sender_id,
            'body' => $message->body,
            'media' => $message->media?->hidden_at ? null : $message->media?->toArray(),
            'read_at' => $message->read_at,
            'created_at' => $message->created_at,
            'sender' => $sender ? [
                'id' => $sender->id,
                'name' => $sender->profile?->full_name ?? $sender->name,
                'username' => $sender->username,
                'avatar' => $senderAvatar,
            ] : null,
        ];
        $this->threadId = (int) $message->chat_thread_id;
    }

    public function broadcastOn()
    {
        return new PrivateChannel('chat.' . $this->threadId);
    }

    public function broadcastAs()
    {
        return 'MessageSent';
    }
}
