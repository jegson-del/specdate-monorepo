<?php

namespace Tests\Feature;

use App\Mail\ContactFormSubmittedMail;
use App\Mail\ContactTicketReplyMail;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupportTicketsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_contact_form_creates_admin_support_ticket_and_queues_email(): void
    {
        Mail::fake();
        config(['mail.contact_address' => 'hello@dateusher.com']);
        User::factory()->create(['role' => 'admin']);

        $ticketId = $this->postJson('/api/public/contact', [
            'name' => 'Ada Visitor',
            'email' => 'ada@example.com',
            'category' => 'provider',
            'subject' => 'Provider partnership',
            'message' => 'I would like to speak to DateUsher about becoming a provider.',
            'captcha_a' => 4,
            'captcha_b' => 7,
            'captcha_answer' => 11,
            'website' => '',
        ])
            ->assertCreated()
            ->assertJsonPath('message', 'Message sent. The DateUsher team will review it from the admin support inbox.')
            ->json('data.ticket_id');

        $this->assertDatabaseHas('support_tickets', [
            'id' => $ticketId,
            'user_id' => null,
            'contact_name' => 'Ada Visitor',
            'contact_email' => 'ada@example.com',
            'category' => 'provider',
            'status' => 'pending_admin',
        ]);
        $this->assertDatabaseHas('support_messages', [
            'support_ticket_id' => $ticketId,
            'sender_id' => null,
            'sender_role' => 'guest',
        ]);

        Mail::assertQueued(ContactFormSubmittedMail::class, fn ($mail) => $mail->hasTo('hello@dateusher.com'));
    }

    public function test_public_contact_form_rejects_wrong_anti_spam_answer(): void
    {
        Mail::fake();

        $this->postJson('/api/public/contact', [
            'name' => 'Ada Visitor',
            'email' => 'ada@example.com',
            'category' => 'account',
            'subject' => 'Account question',
            'message' => 'I need help with my DateUsher account access.',
            'captcha_a' => 4,
            'captcha_b' => 7,
            'captcha_answer' => 12,
            'website' => '',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('data.errors.captcha_answer.0', 'The anti-spam answer is incorrect.');

        $this->assertDatabaseCount('support_tickets', 0);
        Mail::assertNothingQueued();
    }

    public function test_admin_reply_to_public_contact_ticket_emails_visitor(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin']);

        $ticket = SupportTicket::create([
            'user_id' => null,
            'contact_name' => 'Ada Visitor',
            'contact_email' => 'ada@example.com',
            'category' => 'account',
            'subject' => 'Account help',
            'status' => 'pending_admin',
            'last_message_at' => now(),
        ]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/support/tickets/{$ticket->id}/messages", [
            'body' => 'Thanks, we can help with this.',
        ])->assertCreated()
            ->assertJsonPath('data.sender_role', 'admin');

        Mail::assertQueued(ContactTicketReplyMail::class, fn ($mail) => $mail->hasTo('ada@example.com'));
    }

    public function test_user_can_create_and_reply_to_support_ticket(): void
    {
        $user = User::factory()->create();

        Sanctum::actingAs($user);

        $ticketId = $this->postJson('/api/support/tickets', [
            'category' => 'safety',
            'subject' => 'I need help',
            'message' => 'Someone is harassing me in chat.',
        ])->assertCreated()
            ->assertJsonPath('data.category', 'safety')
            ->assertJsonPath('data.status', 'pending_admin')
            ->json('data.id');

        $this->assertDatabaseHas('support_messages', [
            'support_ticket_id' => $ticketId,
            'sender_id' => $user->id,
            'sender_role' => 'user',
            'body' => 'Someone is harassing me in chat.',
        ]);

        $this->postJson("/api/support/tickets/{$ticketId}/messages", [
            'body' => 'Here is more context.',
        ])->assertCreated()
            ->assertJsonPath('data.sender_role', 'user');

        $this->assertDatabaseHas('support_tickets', [
            'id' => $ticketId,
            'status' => 'pending_admin',
        ]);
    }

    public function test_user_cannot_access_another_users_support_ticket(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $ticket = SupportTicket::create([
            'user_id' => $owner->id,
            'category' => 'account',
            'subject' => 'Account help',
            'status' => 'pending_admin',
            'last_message_at' => now(),
        ]);

        Sanctum::actingAs($other);

        $this->getJson("/api/support/tickets/{$ticket->id}")
            ->assertStatus(403)
            ->assertJsonPath('message', 'You cannot access this support ticket.');
    }

    public function test_admin_can_reply_and_user_gets_unread_support_count(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($user);
        $ticketId = $this->postJson('/api/support/tickets', [
            'category' => 'technical',
            'subject' => 'Upload issue',
            'message' => 'Video upload is failing.',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($admin);
        $this->postJson("/api/support/tickets/{$ticketId}/messages", [
            'body' => 'Thanks, we are checking this now.',
        ])->assertCreated()
            ->assertJsonPath('data.sender_role', 'admin');

        Sanctum::actingAs($user);
        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('unread_support_count', 1);

        $this->postJson("/api/support/tickets/{$ticketId}/read")
            ->assertOk();

        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('unread_support_count', 0);
    }

    public function test_support_ticket_messages_are_cursor_paginated(): void
    {
        $user = User::factory()->create();

        Sanctum::actingAs($user);
        $ticketId = $this->postJson('/api/support/tickets', [
            'category' => 'technical',
            'subject' => 'Long support thread',
            'message' => 'Message 1',
        ])->assertCreated()->json('data.id');

        foreach (range(2, 6) as $index) {
            $this->postJson("/api/support/tickets/{$ticketId}/messages", [
                'body' => "Message {$index}",
            ])->assertCreated();
        }

        $firstPage = $this->getJson("/api/support/tickets/{$ticketId}?per_page=3")
            ->assertOk()
            ->assertJsonPath('data.message_pagination.has_more', true)
            ->assertJsonCount(3, 'data.messages')
            ->json('data');

        $this->assertSame('Message 4', $firstPage['messages'][0]['body']);
        $this->assertSame('Message 6', $firstPage['messages'][2]['body']);

        $nextBeforeId = $firstPage['message_pagination']['next_before_id'];
        $secondPage = $this->getJson("/api/support/tickets/{$ticketId}?per_page=3&before_id={$nextBeforeId}")
            ->assertOk()
            ->assertJsonPath('data.message_pagination.has_more', false)
            ->assertJsonCount(3, 'data.messages')
            ->json('data');

        $this->assertSame('Message 1', $secondPage['messages'][0]['body']);
        $this->assertSame('Message 3', $secondPage['messages'][2]['body']);
    }
}
