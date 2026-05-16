<?php

namespace App\Mail;

use App\Models\ProviderInvite;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProviderInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public ProviderInvite $invite,
        public string $inviteUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You are invited to become a Date Usher partner',
            from: config('mail.from.address'),
            replyTo: [config('mail.from.address')],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.provider_invite');
    }
}
