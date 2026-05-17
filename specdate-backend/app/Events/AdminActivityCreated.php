<?php

namespace App\Events;

use App\Models\AdminActivityEvent;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AdminActivityCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public AdminActivityEvent $activity)
    {
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('admin.dashboard');
    }

    public function broadcastAs(): string
    {
        return 'AdminActivityCreated';
    }

    public function broadcastWith(): array
    {
        return [
            'activity' => [
                'id' => $this->activity->id,
                'type' => $this->activity->type,
                'title' => $this->activity->title,
                'body' => $this->activity->body,
                'route' => $this->activity->route,
                'source_type' => $this->activity->source_type,
                'source_id' => $this->activity->source_id,
                'metadata' => $this->activity->metadata ?? [],
                'created_at' => $this->activity->created_at?->toISOString(),
            ],
            'counts' => $this->activity->counts ?? [],
        ];
    }
}
