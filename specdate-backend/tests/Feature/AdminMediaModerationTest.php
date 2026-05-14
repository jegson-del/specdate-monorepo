<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\Notification;
use App\Models\Report;
use App\Models\User;
use App\Services\AdminNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminMediaModerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_rekognition_flagged_and_reported_media(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create();
        $reporter = User::factory()->create();

        $flagged = Media::create([
            'user_id' => $owner->id,
            'file_path' => 'uploads/flagged.jpg',
            'url' => 'https://example.test/uploads/flagged.jpg',
            'type' => 'chat_image',
            'mime_type' => 'image/jpeg',
            'size' => 1234,
            'moderation_status' => 'flagged',
            'moderation_labels' => ['source' => 'rekognition_image'],
        ]);

        $reported = Media::create([
            'user_id' => $owner->id,
            'file_path' => 'uploads/reported.jpg',
            'url' => 'https://example.test/uploads/reported.jpg',
            'type' => 'chat_image',
            'mime_type' => 'image/jpeg',
            'size' => 5678,
            'moderation_status' => 'approved',
            'moderation_labels' => ['skipped' => true],
        ]);

        Report::create([
            'reporter_id' => $reporter->id,
            'reported_user_id' => $owner->id,
            'target_type' => 'media',
            'target_id' => $reported->id,
            'reason' => 'Unsafe media',
            'status' => 'open',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/media-moderation?status=needs_review')
            ->assertOk()
            ->assertJsonFragment(['id' => $reported->id])
            ->assertJsonFragment(['id' => $flagged->id])
            ->assertJsonFragment(['open_reports_count' => 1]);
    }

    public function test_admin_can_approve_gated_media(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create();
        $media = Media::create([
            'user_id' => $owner->id,
            'file_path' => 'uploads/manual.mp3',
            'url' => 'https://example.test/uploads/manual.mp3',
            'type' => 'chat_audio',
            'mime_type' => 'audio/mpeg',
            'size' => 1234,
            'moderation_status' => 'manual_pending',
            'moderation_labels' => ['manual_review' => true],
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/media-moderation/{$media->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.moderation_status', 'approved');

        $this->assertDatabaseHas('media', [
            'id' => $media->id,
            'moderation_status' => 'approved',
        ]);
    }

    public function test_serious_media_moderation_events_create_admin_notification_records(): void
    {
        config(['app.frontend_url' => 'https://admin.example.test']);

        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create();
        $media = Media::create([
            'user_id' => $owner->id,
            'file_path' => 'uploads/flagged.jpg',
            'url' => 'https://example.test/uploads/flagged.jpg',
            'type' => 'chat_image',
            'mime_type' => 'image/jpeg',
            'size' => 1234,
            'moderation_status' => 'flagged',
            'moderation_labels' => ['source' => 'rekognition_image'],
        ]);

        app(AdminNotificationService::class)->notifyMediaModerationCase(
            $media,
            'rekognition_flagged',
            'Upload flagged by Rekognition',
            'A media upload needs admin review before it can be shown.'
        );

        $this->assertDatabaseHas('notifications', [
            'user_id' => $admin->id,
            'type' => 'admin_media_moderation',
        ]);
        $notification = Notification::where('type', 'admin_media_moderation')->firstOrFail();
        $this->assertSame(
            "https://admin.example.test/admin/media-moderation?status=needs_review&media_id={$media->id}",
            $notification->data['admin_url']
        );
        $this->assertSame(1, Notification::where('type', 'admin_media_moderation')->count());
    }
}
