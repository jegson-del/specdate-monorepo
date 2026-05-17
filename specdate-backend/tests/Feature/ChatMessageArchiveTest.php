<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\ChatMessageArchive;
use App\Models\ChatThread;
use App\Models\Media;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChatMessageArchiveTest extends TestCase
{
    use RefreshDatabase;

    public function test_archive_command_dry_run_does_not_delete_messages_or_write_files(): void
    {
        Storage::fake('local');
        config(['chat_archive.disk' => 'local']);
        $thread = $this->thread();
        $message = $this->message($thread, now()->subDays(31), 'Old hello');

        $this->artisan('chats:archive-old-messages')
            ->expectsOutputToContain('eligible for archive')
            ->expectsOutputToContain('Dry run only')
            ->assertSuccessful();

        $this->assertDatabaseHas('chat_messages', ['id' => $message->id]);
        $this->assertSame(0, ChatMessageArchive::count());
        Storage::disk('local')->assertMissing('chat-archives');
    }

    public function test_archive_command_reports_no_work_when_nothing_is_eligible(): void
    {
        Storage::fake('local');
        config(['chat_archive.disk' => 'local']);
        $thread = $this->thread();
        $this->message($thread, now()->subDays(3), 'Recent hello');

        $this->artisan('chats:archive-old-messages')
            ->expectsOutputToContain('No old chat messages eligible for archive')
            ->assertSuccessful();

        $this->artisan('chats:archive-old-messages', ['--commit' => true])
            ->expectsOutputToContain('No old chat messages eligible for archive')
            ->assertSuccessful();

        $this->assertSame(0, ChatMessageArchive::count());
    }

    public function test_archive_command_writes_jsonl_and_removes_only_archived_hot_messages(): void
    {
        Storage::fake('local');
        config(['chat_archive.disk' => 'local']);
        $thread = $this->thread();
        $old = $this->message($thread, now()->subDays(31), 'Old hello');
        $recent = $this->message($thread, now()->subDays(3), 'Recent hello');
        $thread->update(['last_message_id' => $recent->id, 'last_message_at' => $recent->created_at]);

        $this->artisan('chats:archive-old-messages', ['--commit' => true])
            ->expectsOutputToContain('Created 1 archive file(s)')
            ->assertSuccessful();

        $this->assertDatabaseMissing('chat_messages', ['id' => $old->id]);
        $this->assertDatabaseHas('chat_messages', ['id' => $recent->id]);

        $archive = ChatMessageArchive::firstOrFail();
        $this->assertSame($thread->id, (int) $archive->chat_thread_id);
        $this->assertSame($old->id, (int) $archive->from_message_id);
        $this->assertSame($old->id, (int) $archive->to_message_id);
        $this->assertSame(1, (int) $archive->message_count);
        $this->assertSame('stored', $archive->status);
        Storage::disk('local')->assertExists($archive->path);

        $lines = explode("\n", trim(Storage::disk('local')->get($archive->path)));
        $payload = json_decode($lines[0], true);
        $this->assertSame($old->id, $payload['id']);
        $this->assertSame('Old hello', $payload['body']);
        $this->assertSame(hash('sha256', Storage::disk('local')->get($archive->path)), $archive->checksum);
    }

    public function test_reported_messages_and_reported_media_are_not_archived(): void
    {
        Storage::fake('local');
        config(['chat_archive.disk' => 'local']);
        $thread = $this->thread();
        $safe = $this->message($thread, now()->subDays(31), 'Safe old message');
        $reported = $this->message($thread, now()->subDays(31), 'Reported message');
        $reportedMedia = Media::create([
            'user_id' => $thread->owner_id,
            'file_path' => 'uploads/chat/reported.jpg',
            'url' => 'https://example.com/reported.jpg',
            'type' => 'chat_image',
            'mime_type' => 'image/jpeg',
            'size' => 1234,
        ]);
        $messageWithReportedMedia = $this->message($thread, now()->subDays(31), 'Media message', $reportedMedia->id);

        Report::create([
            'reporter_id' => $thread->owner_id,
            'reported_user_id' => $thread->winner_user_id,
            'target_type' => 'message',
            'target_id' => $reported->id,
            'reason' => 'unsafe',
        ]);
        Report::create([
            'reporter_id' => $thread->owner_id,
            'reported_user_id' => $thread->winner_user_id,
            'target_type' => 'media',
            'target_id' => $reportedMedia->id,
            'reason' => 'unsafe',
        ]);

        $this->artisan('chats:archive-old-messages', ['--commit' => true])->assertSuccessful();

        $this->assertDatabaseMissing('chat_messages', ['id' => $safe->id]);
        $this->assertDatabaseHas('chat_messages', ['id' => $reported->id]);
        $this->assertDatabaseHas('chat_messages', ['id' => $messageWithReportedMedia->id]);
        $this->assertSame(1, ChatMessageArchive::sum('message_count'));
    }

    public function test_thread_participant_can_list_and_fetch_archived_messages(): void
    {
        Storage::fake('local');
        config(['chat_archive.disk' => 'local']);
        $thread = $this->thread();
        $old = $this->message($thread, now()->subDays(31), 'Archived hello');

        $this->artisan('chats:archive-old-messages', ['--commit' => true])->assertSuccessful();
        $archive = ChatMessageArchive::firstOrFail();

        Sanctum::actingAs($thread->owner);

        $this->getJson("/api/chats/{$thread->id}/archives")
            ->assertOk()
            ->assertJsonPath('data.0.id', $archive->id)
            ->assertJsonPath('data.0.message_count', 1);

        $this->getJson("/api/chats/{$thread->id}/archives/{$archive->id}")
            ->assertOk()
            ->assertJsonPath('data.archive.id', $archive->id)
            ->assertJsonPath('data.messages.0.id', $old->id)
            ->assertJsonPath('data.messages.0.body', 'Archived hello')
            ->assertJsonPath('data.messages.0.archived', true);
    }

    public function test_non_participant_cannot_access_chat_archives(): void
    {
        Storage::fake('local');
        config(['chat_archive.disk' => 'local']);
        $thread = $this->thread();
        $this->message($thread, now()->subDays(31), 'Private archive');
        $this->artisan('chats:archive-old-messages', ['--commit' => true])->assertSuccessful();
        $archive = ChatMessageArchive::firstOrFail();
        $outsider = User::factory()->create();

        Sanctum::actingAs($outsider);

        $this->getJson("/api/chats/{$thread->id}/archives")
            ->assertStatus(403)
            ->assertJsonPath('message', 'You are not part of this chat.');

        $this->getJson("/api/chats/{$thread->id}/archives/{$archive->id}")
            ->assertStatus(403)
            ->assertJsonPath('message', 'You are not part of this chat.');
    }

    private function thread(): ChatThread
    {
        $owner = User::factory()->create();
        $winner = User::factory()->create();

        return ChatThread::create([
            'type' => 'provider',
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
            'customer_id' => $owner->id,
            'provider_id' => $winner->id,
        ]);
    }

    private function message(ChatThread $thread, $createdAt, string $body, ?int $mediaId = null): ChatMessage
    {
        $message = ChatMessage::create([
            'chat_thread_id' => $thread->id,
            'sender_id' => $thread->owner_id,
            'body' => $body,
            'media_id' => $mediaId,
        ]);

        $message->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->save();

        return $message->fresh();
    }
}
