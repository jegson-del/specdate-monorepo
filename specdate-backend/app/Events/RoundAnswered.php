<?php

namespace App\Events;

use App\Models\SpecRoundAnswer;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoundAnswered implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $answer;

    /**
     * Create a new event instance.
     *
     * @return void
     */
    public function __construct(SpecRoundAnswer $answer)
    {
        $this->answer = $answer->loadMissing('round');
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn()
    {
        return new Channel('spec.' . $this->answer->round->spec_id);
    }

    public function broadcastAs()
    {
        return 'RoundAnswered';
    }
}
