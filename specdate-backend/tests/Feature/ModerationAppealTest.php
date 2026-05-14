<?php

namespace Tests\Feature;

use App\Models\ModerationAction;
use App\Models\ModerationAppeal;
use App\Models\ModerationCase;
use App\Models\ModerationStrike;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ModerationAppealTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_submit_appeal_for_strike_action(): void
    {
        [$admin, $user, $action] = $this->issueStrikeAction();
        Sanctum::actingAs($user);

        $this->postJson('/api/moderation/appeals', [
            'action_id' => $action->id,
            'appeal_text' => 'I understand the concern, but this was taken out of context.',
        ])->assertCreated()
            ->assertJsonPath('data.user_id', $user->id)
            ->assertJsonPath('data.action_id', $action->id)
            ->assertJsonPath('data.status', ModerationAppeal::STATUS_OPEN);

        $this->assertDatabaseHas('moderation_appeals', [
            'user_id' => $user->id,
            'case_id' => $action->case_id,
            'action_id' => $action->id,
            'status' => ModerationAppeal::STATUS_OPEN,
        ]);
        $this->assertDatabaseHas('moderation_cases', [
            'id' => $action->case_id,
            'status' => ModerationCase::STATUS_APPEALED,
        ]);

        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/moderation/appeals')
            ->assertOk()
            ->assertJsonPath('data.data.0.user_id', $user->id);
    }

    public function test_user_cannot_submit_duplicate_open_appeal_for_same_action(): void
    {
        [, $user, $action] = $this->issueStrikeAction();
        Sanctum::actingAs($user);

        $payload = [
            'action_id' => $action->id,
            'appeal_text' => 'Please review the context before this decision stands.',
        ];

        $this->postJson('/api/moderation/appeals', $payload)->assertCreated();
        $this->postJson('/api/moderation/appeals', $payload)
            ->assertStatus(422)
            ->assertJsonPath('message', 'An open appeal already exists for this moderation item.');
    }

    public function test_admin_can_deny_appeal_and_records_audit_action(): void
    {
        [$admin, $user, $action] = $this->issueStrikeAction();
        $appeal = $this->submitAppeal($user, $action);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/moderation/appeals/{$appeal->id}", [
            'status' => ModerationAppeal::STATUS_DENIED,
            'decision_note' => 'The evidence still supports the moderation action.',
        ])->assertOk()
            ->assertJsonPath('data.status', ModerationAppeal::STATUS_DENIED)
            ->assertJsonPath('data.decision_note', 'The evidence still supports the moderation action.');

        $this->assertDatabaseHas('moderation_actions', [
            'case_id' => $action->case_id,
            'user_id' => $user->id,
            'admin_id' => $admin->id,
            'action' => ModerationAction::ACTION_APPEAL_DENIED,
            'reason' => 'The evidence still supports the moderation action.',
        ]);
    }

    public function test_admin_can_grant_strike_appeal_and_recalculate_user_status(): void
    {
        [$admin, $user, $action] = $this->issueStrikeAction();
        $appeal = $this->submitAppeal($user, $action);
        $strikeId = (int) $action->metadata['strike_id'];

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/moderation/appeals/{$appeal->id}", [
            'status' => ModerationAppeal::STATUS_GRANTED,
            'decision_note' => 'Context confirms this should not count as a strike.',
        ])->assertOk()
            ->assertJsonPath('data.status', ModerationAppeal::STATUS_GRANTED)
            ->assertJsonPath('data.result.type', 'strike_revoked')
            ->assertJsonPath('data.result.strike.id', $strikeId)
            ->assertJsonPath('data.result.strike.active', false)
            ->assertJsonPath('data.result.strike.user.strike_count', 0)
            ->assertJsonPath('data.result.strike.user.moderation_status', 'active');

        $this->assertDatabaseHas('moderation_strikes', [
            'id' => $strikeId,
            'active' => false,
            'revoked_by_user_id' => $admin->id,
            'revocation_reason' => 'Context confirms this should not count as a strike.',
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'strike_count' => 0,
            'moderation_status' => 'active',
        ]);
        $this->assertDatabaseHas('moderation_actions', [
            'case_id' => $action->case_id,
            'user_id' => $user->id,
            'admin_id' => $admin->id,
            'action' => ModerationAction::ACTION_APPEAL_GRANTED,
        ]);
        $this->assertDatabaseHas('moderation_actions', [
            'case_id' => $action->case_id,
            'user_id' => $user->id,
            'admin_id' => $admin->id,
            'action' => ModerationAction::ACTION_STRIKE_REVOKED,
        ]);
    }

    public function test_user_moderation_status_includes_active_strikes_and_appealable_actions(): void
    {
        [, $user, $action] = $this->issueStrikeAction();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/me/moderation')
            ->assertOk()
            ->assertJsonPath('data.user.moderation_status', 'warned')
            ->assertJsonPath('data.user.strike_count', 1)
            ->assertJsonPath('data.active_strikes.0.id', (int) $action->metadata['strike_id']);

        $this->assertContains(
            $action->id,
            collect($response->json('data.appealable_actions'))->pluck('id')->all()
        );
    }

    private function issueStrikeAction(): array
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();
        $case = ModerationCase::create([
            'subject_user_id' => $user->id,
            'source' => ModerationCase::SOURCE_REPORT,
            'target_type' => 'message',
            'target_id' => 123,
            'severity' => ModerationCase::SEVERITY_HIGH,
            'status' => ModerationCase::STATUS_OPEN,
            'summary' => 'Reported message',
            'opened_at' => now(),
        ]);

        Sanctum::actingAs($admin);
        $this->postJson("/api/admin/moderation/cases/{$case->id}/strike", [
            'category' => ModerationStrike::CATEGORY_HARASSMENT,
            'severity' => ModerationStrike::SEVERITY_MEDIUM,
            'reason' => 'Confirmed harassment in chat.',
        ])->assertCreated();

        $action = ModerationAction::query()
            ->where('case_id', $case->id)
            ->where('user_id', $user->id)
            ->where('action', ModerationAction::ACTION_STRIKE)
            ->firstOrFail();

        return [$admin, $user, $action->fresh('case')];
    }

    private function submitAppeal(User $user, ModerationAction $action): ModerationAppeal
    {
        Sanctum::actingAs($user);
        $appealId = $this->postJson('/api/moderation/appeals', [
            'action_id' => $action->id,
            'appeal_text' => 'Please review this with the full surrounding context.',
        ])->assertCreated()
            ->json('data.id');

        return ModerationAppeal::query()->findOrFail($appealId);
    }
}
