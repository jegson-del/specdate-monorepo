<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\{Content, Envelope};
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\{Auth, DB, Hash, Log, Mail, Password};
use Illuminate\Support\Str;

use App\Models\User;
class ProviderApprovedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $setupUrl
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your DateUsher provider application is approved',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.provider_approved',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
