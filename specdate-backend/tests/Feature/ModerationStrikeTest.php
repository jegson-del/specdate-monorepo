<?php

namespace Tests\Feature;

use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\ModerationStrike;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
