<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RoundNudgeNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public $spec;
    public $round;

    /**
     * Create a new notification instance.
     */
    public function __construct($spec, $round)
    {
        $this->spec = $spec;
        $this->round = $round;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'round_nudge',
            'spec_id' => $this->spec->id,
            'round_id' => $this->round->id,
            'title' => 'Action Required',
            'message' => "You have not answered the question for '{$this->spec->title}' yet. Please submit your answer soon!",
        ];
    }
}
