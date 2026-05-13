<?php

namespace Tests\Feature;

use App\Models\BlockedUser;
use App\Models\ChatThread;
use App\Models\Media;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProviderChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_open_provider_chat_and_provider_can_reply(): void
    {
        $customer = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);

        Sanctum::actingAs($customer);

        $threadId = $this->postJson("/api/providers/{$provider->id}/chat")
            ->assertCreated()
            ->assertJsonPath('data.type', 'provider')
            ->assertJsonPath('data.provider_id', $provider->id)
            ->assertJsonPath('data.customer_id', $customer->id)
            ->assertJsonPath('data.other_user.id', $provider->id)
            ->json('data.id');

        $this->assertDatabaseHas('chat_threads', [
            'id' => $threadId,
            'type' => 'provider',
            'owner_id' => $customer->id,
            'winner_user_id' => $provider->id,
            'customer_id' => $customer->id,
            'provider_id' => $provider->id,
        ]);

        Sanctum::actingAs($provider);

        $this->getJson('/api/chats')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $threadId)
            ->assertJsonPath('data.data.0.other_user.id', $customer->id);

        $this->postJson("/api/chats/{$threadId}/messages", [
            'body' => 'We can help with your booking.',
        ])->assertCreated()
            ->assertJsonPath('data.body', 'We can help with your booking.');

        Sanctum::actingAs($customer);

        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('unread_chat_count', 1);
    }

    public function test_blocked_provider_chat_cannot_be_opened(): void
    {
        $customer = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);
        BlockedUser::create(['blocker_id' => $provider->id, 'blocked_id' => $customer->id]);

        Sanctum::actingAs($customer);

        $this->postJson("/api/providers/{$provider->id}/chat")
            ->assertStatus(403)
            ->assertJsonPath('message', 'This chat is unavailable because one of you blocked the other user.');

        $this->assertSame(0, ChatThread::count());
    }

    public function test_chat_rejects_unapproved_media(): void
    {
        $customer = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);
        $thread = ChatThread::create([
            'type' => 'provider',
            'owner_id' => $customer->id,
            'winner_user_id' => $provider->id,
            'customer_id' => $customer->id,
            'provider_id' => $provider->id,
        ]);
        $media = Media::create([
            'user_id' => $customer->id,
            'file_path' => 'uploads/chat/pending.jpg',
            'url' => 'https://example.com/pending.jpg',
            'type' => 'chat_image',
            'mime_type' => 'image/jpeg',
            'size' => 1234,
            'moderation_status' => 'pending',
        ]);

        Sanctum::actingAs($customer);

        $this->postJson("/api/chats/{$thread->id}/messages", [
            'media_id' => $media->id,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'This file could not be sent. Please choose a different file.');
    }

    public function test_chat_allows_manual_pending_audio_media(): void
    {
        $customer = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);
        $thread = ChatThread::create([
            'type' => 'provider',
            'owner_id' => $customer->id,
            'winner_user_id' => $provider->id,
            'customer_id' => $customer->id,
            'provider_id' => $provider->id,
        ]);
        $media = Media::create([
            'user_id' => $customer->id,
            'file_path' => 'uploads/chat/audio.m4a',
            'url' => 'https://example.com/audio.m4a',
            'type' => 'chat_audio',
            'mime_type' => 'audio/mp4',
            'size' => 1234,
            'moderation_status' => 'manual_pending',
        ]);

        Sanctum::actingAs($customer);

        $this->postJson("/api/chats/{$thread->id}/messages", [
            'media_id' => $media->id,
        ])->assertCreated()
            ->assertJsonPath('data.media.id', $media->id);
    }
}
