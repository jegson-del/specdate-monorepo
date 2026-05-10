<?php

namespace Tests\Feature;

use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupportTicketsTest extends TestCase
{
    use RefreshDatabase;

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
