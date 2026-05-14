<?php

namespace Tests\Feature;

use App\Models\BlockedUser;
use App\Models\ChatMessage;
use App\Models\ChatThread;
use App\Models\DatePartnerReview;
use App\Models\DateVoucher;
use App\Models\Media;
use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\ProviderProfile;
use App\Models\ProviderReview;
use App\Models\Report;
use App\Models\Spec;
use App\Models\SpecDate;
use App\Models\User;
use App\Services\BlockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class ModerationAndBlockingTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_block_and_unblock_another_user(): void
    {
        $blocker = User::factory()->create();
        $blocked = User::factory()->create();

        $service = app(BlockService::class);

        $service->block($blocker, $blocked->id, 'Harassment');

        $this->assertDatabaseHas('blocked_users', [
            'blocker_id' => $blocker->id,
            'blocked_id' => $blocked->id,
            'reason' => 'Harassment',
        ]);
        $this->assertTrue($service->hasBlockBetween($blocker->id, $blocked->id));

        $service->unblock($blocker, $blocked->id);

        $this->assertDatabaseMissing('blocked_users', [
            'blocker_id' => $blocker->id,
            'blocked_id' => $blocked->id,
        ]);
    }

    public function test_user_cannot_block_self(): void
    {
        $user = User::factory()->create();

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('You cannot block yourself.');

        app(BlockService::class)->block($user, $user->id);
    }

    public function test_blocked_users_cannot_send_chat_messages(): void
    {
        [$owner, $winner, $thread] = $this->createChatThread();
        BlockedUser::create(['blocker_id' => $owner->id, 'blocked_id' => $winner->id]);

        Sanctum::actingAs($winner);

        $this->postJson("/api/chats/{$thread->id}/messages", [
            'body' => 'Hello?',
        ])->assertStatus(403)
            ->assertJsonPath('message', 'This chat is unavailable because one of you blocked the other user.');

        $this->assertDatabaseMissing('chat_messages', [
            'chat_thread_id' => $thread->id,
            'sender_id' => $winner->id,
            'body' => 'Hello?',
        ]);
    }

    public function test_report_can_be_created_and_admin_can_hide_message(): void
    {
        [$owner, $winner, $thread] = $this->createChatThread();
        $message = ChatMessage::create([
            'chat_thread_id' => $thread->id,
            'sender_id' => $owner->id,
            'body' => 'Abusive message',
        ]);
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($winner);
        $reportId = $this->postJson('/api/reports', [
            'target_type' => 'message',
            'target_id' => $message->id,
            'reason' => 'Harassment or abuse',
        ])->assertCreated()
            ->assertJsonPath('data.reported_user_id', $owner->id)
            ->json('data.id');

        $this->assertDatabaseHas('moderation_cases', [
            'subject_user_id' => $owner->id,
            'opened_by_user_id' => $winner->id,
            'source' => ModerationCase::SOURCE_REPORT,
            'target_type' => 'message',
            'target_id' => $message->id,
            'status' => ModerationCase::STATUS_OPEN,
            'severity' => ModerationCase::SEVERITY_HIGH,
        ]);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/reports/{$reportId}", [
            'status' => 'resolved',
            'action' => 'hide_content',
            'action_note' => 'Confirmed abuse',
        ])->assertOk()
            ->assertJsonPath('data.status', 'resolved')
            ->assertJsonPath('data.action', 'hide_content');

        $this->assertNotNull($message->fresh()->hidden_at);
        $this->assertSame('Confirmed abuse', $message->fresh()->hidden_reason);
        $this->assertDatabaseHas('moderation_cases', [
            'source' => ModerationCase::SOURCE_REPORT,
            'target_type' => 'message',
            'target_id' => $message->id,
            'status' => ModerationCase::STATUS_ACTIONED,
        ]);
        $this->assertDatabaseHas('moderation_actions', [
            'user_id' => $owner->id,
            'target_type' => 'message',
            'target_id' => $message->id,
            'admin_id' => $admin->id,
            'action' => ModerationAction::ACTION_HIDE_CONTENT,
            'reason' => 'Confirmed abuse',
        ]);
    }

    public function test_user_cannot_report_own_media(): void
    {
        $user = User::factory()->create();
        $media = Media::create([
            'user_id' => $user->id,
            'file_path' => 'uploads/test.jpg',
            'url' => 'https://example.com/test.jpg',
            'type' => 'profile_gallery',
            'mime_type' => 'image/jpeg',
            'size' => 123,
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/reports', [
            'target_type' => 'media',
            'target_id' => $media->id,
            'reason' => 'Other',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'You cannot report your own content.');

        $this->assertSame(0, Report::count());
    }

    public function test_user_can_report_provider_profile(): void
    {
        $reporter = User::factory()->create();
        $providerUser = User::factory()->create(['role' => 'provider']);
        $provider = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'company_name' => 'Date Venue',
            'description' => 'Misleading venue content',
            'city' => 'Lagos',
            'country' => 'Nigeria',
        ]);

        Sanctum::actingAs($reporter);

        $this->postJson('/api/reports', [
            'target_type' => 'provider_profile',
            'target_id' => $provider->id,
            'reason' => 'Scam or misleading content',
        ])->assertCreated()
            ->assertJsonPath('data.reported_user_id', $providerUser->id);
    }

    public function test_user_can_report_provider_review_and_date_partner_review(): void
    {
        [$owner, $winner, , $date] = $this->createChatThread();
        $reporter = User::factory()->create();
        $providerUser = User::factory()->create(['role' => 'provider']);
        $provider = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'company_name' => 'Review Venue',
        ]);
        $voucher = DateVoucher::create([
            'spec_date_id' => $date->id,
            'provider_profile_id' => $provider->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
            'requested_by_user_id' => $owner->id,
            'voucher_code' => 'RVW12345',
            'qr_token' => 'review-token-12345',
            'discount_percentage' => 15,
            'status' => DateVoucher::STATUS_REDEEMED,
        ]);
        $providerReview = ProviderReview::create([
            'provider_profile_id' => $provider->id,
            'date_voucher_id' => $voucher->id,
            'reviewer_id' => $owner->id,
            'rating' => 1,
            'comment' => 'Unsafe wording',
        ]);
        $partnerReview = DatePartnerReview::create([
            'spec_date_id' => $date->id,
            'date_voucher_id' => $voucher->id,
            'reviewer_id' => $winner->id,
            'reviewed_user_id' => $owner->id,
            'rating' => 1,
            'comment' => 'Abusive wording',
        ]);

        Sanctum::actingAs($reporter);

        $this->postJson('/api/reports', [
            'target_type' => 'provider_review',
            'target_id' => $providerReview->id,
            'reason' => 'Harassment or abuse',
        ])->assertCreated()
            ->assertJsonPath('data.reported_user_id', $owner->id);

        $this->postJson('/api/reports', [
            'target_type' => 'date_partner_review',
            'target_id' => $partnerReview->id,
            'reason' => 'Harassment or abuse',
        ])->assertCreated()
            ->assertJsonPath('data.reported_user_id', $winner->id);
    }

    private function createChatThread(): array
    {
        $owner = User::factory()->create();
        $winner = User::factory()->create();
        $spec = Spec::create([
            'user_id' => $owner->id,
            'title' => 'Dinner quest',
            'description' => 'Find a date',
            'expires_at' => now()->addDays(3),
            'max_participants' => 2,
            'status' => 'COMPLETED',
        ]);
        $date = SpecDate::create([
            'spec_id' => $spec->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
            'date_code' => 'ABC123',
        ]);
        $thread = ChatThread::create([
            'spec_date_id' => $date->id,
            'spec_id' => $spec->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
        ]);

        return [$owner, $winner, $thread, $date];
    }
}
