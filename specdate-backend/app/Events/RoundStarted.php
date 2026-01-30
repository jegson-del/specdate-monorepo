<?php

namespace App\Events;

use App\Models\SpecRound;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoundStarted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $round;

    public function __construct($round)
    {
        $this->round = $round;
    }

    public function broadcastOn()
    {
        return new Channel('spec.' . $this->round->spec_id);
    }

    public function broadcastAs()
    {
        return 'RoundStarted';
    }
}
