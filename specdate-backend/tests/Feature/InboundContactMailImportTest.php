<?php

namespace Tests\Feature;

use App\Mail\ContactTicketReplyMail;
use App\Models\InboundMailImport;
use App\Models\SupportTicket;
use App\Services\InboundContactMailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InboundContactMailImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_reply_email_includes_ticket_marker(): void
    {
        $ticket = SupportTicket::create([
            'user_id' => null,
            'contact_name' => 'Ada Visitor',
            'contact_email' => 'ada@example.com',
            'category' => 'provider',
            'subject' => 'Provider inquiry',
            'status' => 'pending_user',
        ]);

        $mail = new ContactTicketReplyMail($ticket, 'Please send the venue details.');

        $this->assertStringContainsString("[DU-{$ticket->id}]", $mail->envelope()->subject);
        $this->assertSame("DU-{$ticket->id}", $mail->headers()->text['X-DateUsher-Ticket']);
    }

    public function test_imports_matching_inbound_email_reply_into_contact_thread(): void
    {
        $ticket = SupportTicket::create([
            'user_id' => null,
            'contact_name' => 'Ada Visitor',
            'contact_email' => 'ada@example.com',
            'category' => 'provider',
            'subject' => 'Provider inquiry',
            'status' => 'pending_user',
        ]);

        $summary = app(InboundContactMailService::class)->importMessages([
            [
                'uid' => '101',
                'message_id' => '<reply-101@example.com>',
                'from_email' => 'Ada Visitor <ada@example.com>',
                'subject' => "Re: DateUsher support [DU-{$ticket->id}]: Provider inquiry",
                'text_body' => "Thanks, here are more details.\n\nOn DateUsher wrote:",
                'html_body' => '',
                'received_at' => now(),
            ],
        ]);

        $this->assertSame(1, $summary['imported']);
        $this->assertDatabaseHas('support_messages', [
            'support_ticket_id' => $ticket->id,
            'sender_id' => null,
            'sender_role' => 'guest',
            'body' => 'Thanks, here are more details.',
        ]);
        $this->assertDatabaseHas('support_tickets', [
            'id' => $ticket->id,
            'status' => 'pending_admin',
        ]);
        $this->assertDatabaseHas('inbound_mail_imports', [
            'uid' => '101',
            'message_id' => 'reply-101@example.com',
            'support_ticket_id' => $ticket->id,
            'status' => 'imported',
        ]);
    }

    public function test_import_skips_reply_when_sender_does_not_match_ticket_contact(): void
    {
        $ticket = SupportTicket::create([
            'user_id' => null,
            'contact_name' => 'Ada Visitor',
            'contact_email' => 'ada@example.com',
            'category' => 'provider',
            'subject' => 'Provider inquiry',
            'status' => 'pending_user',
        ]);

        $summary = app(InboundContactMailService::class)->importMessages([
            [
                'uid' => '102',
                'message_id' => '<reply-102@example.com>',
                'from_email' => 'other@example.com',
                'subject' => "Re: DateUsher support [DU-{$ticket->id}]: Provider inquiry",
                'text_body' => 'This should not attach.',
                'html_body' => '',
                'received_at' => now(),
            ],
        ]);

        $this->assertSame(1, $summary['skipped']);
        $this->assertDatabaseMissing('support_messages', [
            'support_ticket_id' => $ticket->id,
            'body' => 'This should not attach.',
        ]);
        $this->assertDatabaseHas('inbound_mail_imports', [
            'uid' => '102',
            'status' => 'skipped',
        ]);
    }

    public function test_import_does_not_create_duplicate_messages_for_same_email(): void
    {
        $ticket = SupportTicket::create([
            'user_id' => null,
            'contact_name' => 'Ada Visitor',
            'contact_email' => 'ada@example.com',
            'category' => 'provider',
            'subject' => 'Provider inquiry',
            'status' => 'pending_user',
        ]);
        $message = [
            'uid' => '103',
            'message_id' => '<reply-103@example.com>',
            'from_email' => 'ada@example.com',
            'subject' => "Re: DateUsher support [DU-{$ticket->id}]: Provider inquiry",
            'text_body' => 'One inbound reply.',
            'html_body' => '',
            'received_at' => now(),
        ];

        $service = app(InboundContactMailService::class);
        $first = $service->importMessages([$message]);
        $second = $service->importMessages([$message]);

        $this->assertSame(1, $first['imported']);
        $this->assertSame(1, $second['duplicate']);
        $this->assertSame(1, $ticket->messages()->where('body', 'One inbound reply.')->count());
        $this->assertSame(1, InboundMailImport::query()->where('uid', '103')->count());
    }
}
