<?php

namespace Tests\Feature;

use App\Mail\ContactTicketReplyMail;
use App\Models\AdminAccess;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminContactTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_contact_module_requires_contact_access(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        AdminAccess::create([
            'admin_id' => $admin->id,
            'can_manage_contact_messages' => false,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/contact')
            ->assertForbidden()
            ->assertJsonPath('message', 'Admin contact message access required.');
    }

    public function test_contact_admin_can_list_thread_reply_and_delete_public_contact(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin']);
        AdminAccess::create([
            'admin_id' => $admin->id,
            'can_manage_contact_messages' => true,
            'approved_at' => now(),
        ]);
        $ticket = SupportTicket::create([
            'user_id' => null,
            'contact_name' => 'Ada Visitor',
            'contact_email' => 'ada@example.com',
            'category' => 'provider',
            'subject' => 'Provider inquiry',
            'status' => 'pending_admin',
            'last_message_at' => now(),
        ]);
        $ticket->messages()->create([
            'sender_id' => null,
            'sender_role' => 'guest',
            'body' => 'Can DateUsher list my venue?',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/contact')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $ticket->id)
            ->assertJsonPath('data.data.0.contact_email', 'ada@example.com');

        $this->getJson("/api/admin/contact/{$ticket->id}")
            ->assertOk()
            ->assertJsonPath('data.ticket.id', $ticket->id)
            ->assertJsonPath('data.messages.0.sender_role', 'guest');

        $this->postJson("/api/admin/contact/{$ticket->id}/reply", [
            'body' => 'Yes, please send us your provider details.',
        ])
            ->assertCreated()
            ->assertJsonPath('data.sender_role', 'admin');

        Mail::assertQueued(ContactTicketReplyMail::class, fn ($mail) => $mail->hasTo('ada@example.com'));

        $this->patchJson("/api/admin/contact/{$ticket->id}", [
            'status' => 'resolved',
        ])->assertOk()
            ->assertJsonPath('data.status', 'resolved');

        $this->deleteJson("/api/admin/contact/{$ticket->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Contact message deleted.');

        $this->assertDatabaseMissing('support_tickets', ['id' => $ticket->id]);
    }
}
