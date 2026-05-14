<?php

namespace Tests\Feature;

use App\Models\ChatThread;
use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\ModerationStrike;
use App\Models\Spec;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ModerationStrikeTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_issue_strike_and_user_counter_updates(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();
        $case = $this->caseForUser($user);

        Sanctum::actingAs($admin);

        $this->postJson("/api/admin/moderation/cases/{$case->id}/strike", [
            'category' => ModerationStrike::CATEGORY_HARASSMENT,
            'severity' => ModerationStrike::SEVERITY_MEDIUM,
            'reason' => 'Confirmed harassment in chat.',
            'evidence' => ['message_id' => 123],
        ])->assertCreated()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.strike_number', 1)
            ->assertJsonPath('data.active', true)
            ->assertJsonPath('data.user.strike_count', 1)
            ->assertJsonPath('data.user.moderation_status', 'warned');

        $this->assertDatabaseHas('moderation_strikes', [
            'user_id' => $user->id,
            'case_id' => $case->id,
            'issued_by_user_id' => $admin->id,
            'strike_number' => 1,
            'category' => ModerationStrike::CATEGORY_HARASSMENT,
            'severity' => ModerationStrike::SEVERITY_MEDIUM,
            'active' => true,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'strike_count' => 1,
            'moderation_status' => 'warned',
        ]);
        $this->assertDatabaseHas('moderation_actions', [
            'case_id' => $case->id,
            'user_id' => $user->id,
            'admin_id' => $admin->id,
            'action' => ModerationAction::ACTION_STRIKE,
            'reason' => 'Confirmed harassment in chat.',
        ]);
        $this->assertDatabaseHas('moderation_actions', [
            'case_id' => $case->id,
            'user_id' => $user->id,
            'admin_id' => $admin->id,
            'action' => ModerationAction::ACTION_WARNING,
            'reason' => 'Confirmed harassment in chat.',
        ]);
    }

    public function test_admin_can_revoke_strike_and_user_counter_recalculates(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();
        $case = $this->caseForUser($user);

        Sanctum::actingAs($admin);

        $strikeId = $this->postJson("/api/admin/moderation/cases/{$case->id}/strike", [
            'category' => ModerationStrike::CATEGORY_UNSAFE_MEDIA,
            'severity' => ModerationStrike::SEVERITY_LOW,
            'reason' => 'Unsafe upload confirmed.',
        ])->assertCreated()
            ->json('data.id');

        $this->postJson("/api/admin/moderation/strikes/{$strikeId}/revoke", [
            'reason' => 'Appeal accepted after review.',
        ])->assertOk()
            ->assertJsonPath('data.id', $strikeId)
            ->assertJsonPath('data.active', false)
            ->assertJsonPath('data.user.strike_count', 0)
            ->assertJsonPath('data.user.moderation_status', 'active');

        $this->assertDatabaseHas('moderation_strikes', [
            'id' => $strikeId,
            'active' => false,
            'revoked_by_user_id' => $admin->id,
            'revocation_reason' => 'Appeal accepted after review.',
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'strike_count' => 0,
            'moderation_status' => 'active',
        ]);
        $this->assertDatabaseHas('moderation_actions', [
            'user_id' => $user->id,
            'admin_id' => $admin->id,
            'action' => ModerationAction::ACTION_STRIKE_REVOKED,
            'reason' => 'Appeal accepted after review.',
        ]);
    }

    public function test_second_strike_temporarily_suspends_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();
        Sanctum::actingAs($admin);

        $this->issueStrike($user, ModerationStrike::CATEGORY_HARASSMENT, ModerationStrike::SEVERITY_MEDIUM, 'First confirmed issue.');
        $this->issueStrike($user, ModerationStrike::CATEGORY_HARASSMENT, ModerationStrike::SEVERITY_MEDIUM, 'Second confirmed issue.')
            ->assertJsonPath('data.enforcement.action', ModerationAction::ACTION_TEMPORARY_SUSPENSION);

        $user->refresh();
        $this->assertTrue((bool) $user->is_paused);
        $this->assertSame('suspended', $user->moderation_status);
        $this->assertNotNull($user->suspended_until);
        $this->assertDatabaseHas('moderation_actions', [
            'user_id' => $user->id,
            'admin_id' => $admin->id,
            'action' => ModerationAction::ACTION_TEMPORARY_SUSPENSION,
            'reason' => 'Second confirmed issue.',
        ]);
    }

    public function test_third_strike_permanently_bans_user_and_deletes_tokens(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();
        $user->createToken('mobile');
        Sanctum::actingAs($admin);

        $this->issueStrike($user, ModerationStrike::CATEGORY_HARASSMENT, ModerationStrike::SEVERITY_LOW, 'First issue.');
        $this->issueStrike($user, ModerationStrike::CATEGORY_HARASSMENT, ModerationStrike::SEVERITY_LOW, 'Second issue.');
        $this->issueStrike($user, ModerationStrike::CATEGORY_HARASSMENT, ModerationStrike::SEVERITY_LOW, 'Third issue.')
            ->assertJsonPath('data.enforcement.action', ModerationAction::ACTION_PERMANENT_BAN);

        $user->refresh();
        $this->assertNotNull($user->banned_at);
        $this->assertSame('permanently_banned', $user->moderation_status);
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_high_severity_scam_bypasses_ladder_and_bans_on_first_strike(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();
        Sanctum::actingAs($admin);

        $this->issueStrike($user, ModerationStrike::CATEGORY_SCAM, ModerationStrike::SEVERITY_HIGH, 'Confirmed payment scam.')
            ->assertJsonPath('data.enforcement.action', ModerationAction::ACTION_PERMANENT_BAN);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'moderation_status' => 'permanently_banned',
            'is_paused' => true,
        ]);
    }

    public function test_suspended_user_cannot_send_chat_create_spec_or_upload_media(): void
    {
        Storage::fake('public');
        config(['filesystems.default' => 'public']);

        $user = User::factory()->create([
            'is_paused' => true,
            'moderation_status' => 'suspended',
            'suspended_until' => now()->addDays(3),
        ]);
        $other = User::factory()->create();
        $thread = ChatThread::create([
            'owner_id' => $user->id,
            'winner_user_id' => $other->id,
        ]);

        Sanctum::actingAs($user);

        $this->postJson("/api/chats/{$thread->id}/messages", ['body' => 'Blocked'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Your account is temporarily suspended.');

        $this->postJson('/api/specs', [
            'title' => 'Blocked spec',
            'description' => 'Should not be created.',
            'duration' => 3,
            'max_participants' => 2,
        ])->assertForbidden()
            ->assertJsonPath('message', 'Your account is temporarily suspended.');

        $this->post('/api/media/upload', [
            'type' => 'avatar',
            'file' => UploadedFile::fake()->create('avatar.jpg', 100, 'image/jpeg'),
        ])->assertForbidden();

        $this->assertSame(0, Spec::where('user_id', $user->id)->count());
    }

    private function issueStrike(User $user, string $category, string $severity, string $reason)
    {
        $case = $this->caseForUser($user);

        return $this->postJson("/api/admin/moderation/cases/{$case->id}/strike", [
            'category' => $category,
            'severity' => $severity,
            'reason' => $reason,
        ])->assertCreated();
    }

    private function caseForUser(User $user): ModerationCase
    {
        return ModerationCase::create([
            'subject_user_id' => $user->id,
            'source' => ModerationCase::SOURCE_REPORT,
            'target_type' => 'message',
            'target_id' => 123,
            'severity' => ModerationCase::SEVERITY_HIGH,
            'status' => ModerationCase::STATUS_OPEN,
            'summary' => 'Reported message',
            'opened_at' => now(),
        ]);
    }
}
