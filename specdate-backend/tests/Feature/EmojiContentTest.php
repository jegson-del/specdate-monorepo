<?php

namespace Tests\Feature;

use App\Models\ChatThread;
use App\Models\Notification as AppNotification;
use App\Models\Spec;
use App\Models\SpecApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmojiContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_match_chat_message_preserves_emoji_content(): void
    {
        $sender = User::factory()->create();
        $receiver = User::factory()->create();
        $thread = ChatThread::create([
            'type' => 'match',
            'owner_id' => $sender->id,
            'winner_user_id' => $receiver->id,
        ]);
        $body = "Can't wait for tonight 😊🔥";

        Sanctum::actingAs($sender);

        $this->postJson("/api/chats/{$thread->id}/messages", ['body' => $body])
            ->assertCreated()
            ->assertJsonPath('data.body', $body);

        $this->assertDatabaseHas('chat_messages', [
            'chat_thread_id' => $thread->id,
            'sender_id' => $sender->id,
            'body' => $body,
        ]);

        $notification = AppNotification::query()
            ->where('user_id', $receiver->id)
            ->where('type', 'chat_message')
            ->firstOrFail();

        $this->assertSame($body, $notification->data['message_preview']);
        $this->assertStringContainsString('😊🔥', $notification->data['message']);
    }

    public function test_provider_chat_message_preserves_emoji_content(): void
    {
        $customer = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);
        $body = 'Your table is ready 🍽️✨';

        Sanctum::actingAs($customer);

        $threadId = $this->postJson("/api/providers/{$provider->id}/chat")
            ->assertCreated()
            ->json('data.id');

        Sanctum::actingAs($provider);

        $this->postJson("/api/chats/{$threadId}/messages", ['body' => $body])
            ->assertCreated()
            ->assertJsonPath('data.body', $body);
    }

    public function test_support_ticket_and_reply_preserve_emoji_content(): void
    {
        $user = User::factory()->create();
        $subject = 'Upload issue 😅';
        $message = 'My video upload keeps spinning 🎥';
        $reply = 'Adding one more screenshot 📸';

        Sanctum::actingAs($user);

        $ticketId = $this->postJson('/api/support/tickets', [
            'category' => 'technical',
            'subject' => $subject,
            'message' => $message,
        ])->assertCreated()
            ->assertJsonPath('data.subject', $subject)
            ->json('data.id');

        $this->assertDatabaseHas('support_messages', [
            'support_ticket_id' => $ticketId,
            'sender_id' => $user->id,
            'body' => $message,
        ]);

        $this->postJson("/api/support/tickets/{$ticketId}/messages", ['body' => $reply])
            ->assertCreated()
            ->assertJsonPath('data.body', $reply);
    }

    public function test_round_questions_and_answers_preserve_emoji_content(): void
    {
        [$owner, $participant, $spec] = $this->createSpecWithAcceptedParticipant();
        $question = 'What would your perfect date look like? 🌅';
        $answer = 'Coffee, a walk, then live music ☕🎶';

        Sanctum::actingAs($owner);

        $roundId = $this->postJson("/api/specs/{$spec->id}/rounds", ['question' => $question])
            ->assertOk()
            ->assertJsonPath('data.question_text', $question)
            ->json('data.id');

        Sanctum::actingAs($participant);

        $this->postJson("/api/rounds/{$roundId}/answer", ['answer' => $answer])
            ->assertOk()
            ->assertJsonPath('data.answer_text', $answer);

        $this->assertDatabaseHas('spec_rounds', [
            'id' => $roundId,
            'question_text' => $question,
        ]);
        $this->assertDatabaseHas('spec_round_answers', [
            'spec_round_id' => $roundId,
            'user_id' => $participant->id,
            'answer_text' => $answer,
        ]);
    }

    private function createSpecWithAcceptedParticipant(): array
    {
        $owner = User::factory()->create();
        $participant = User::factory()->create();
        $spec = Spec::create([
            'user_id' => $owner->id,
            'title' => 'Emoji round quest',
            'description' => 'Make sure unicode content survives.',
            'expires_at' => now()->addDays(3),
            'max_participants' => 2,
            'status' => 'ACTIVE',
        ]);
        SpecApplication::create([
            'spec_id' => $spec->id,
            'user_id' => $participant->id,
            'user_role' => 'participant',
            'status' => 'ACCEPTED',
        ]);

        return [$owner, $participant, $spec];
    }
}
