<?php

namespace App\Mail;

use App\Models\Spec;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SpecReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public Spec $spec,
        public string $timing
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->timing === 'today'
                ? "Your spec starts today: {$this->spec->title}"
                : "Your spec starts tomorrow: {$this->spec->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.spec_reminder',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
