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
        $this->message = $message->toArray();
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
