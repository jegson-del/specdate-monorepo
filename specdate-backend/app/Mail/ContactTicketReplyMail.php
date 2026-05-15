<?php

namespace App\Mail;

use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;

class ContactTicketReplyMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public SupportTicket $ticket,
        public string $replyBody,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "DateUsher support [DU-{$this->ticket->id}]: " . $this->ticket->subject,
            replyTo: [config('mail.contact_address') ?: config('mail.from.address')],
        );
    }

    public function headers(): Headers
    {
        return new Headers(
            text: [
                'X-DateUsher-Ticket' => "DU-{$this->ticket->id}",
            ],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.contact_ticket_reply',
        );
    }
}
