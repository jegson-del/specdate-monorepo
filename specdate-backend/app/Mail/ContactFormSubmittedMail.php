<?php

namespace App\Mail;

use App\Models\SupportTicket;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactFormSubmittedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public SupportTicket $ticket,
        public string $messageBody,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'DateUsher contact: ' . $this->ticket->subject,
            replyTo: [$this->ticket->contact_email],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.contact_form_submitted',
        );
    }
}
