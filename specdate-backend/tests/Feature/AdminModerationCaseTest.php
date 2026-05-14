<?php

namespace Tests\Feature;

use App\Models\ModerationAction;
use App\Models\ModerationAppeal;
use App\Models\ModerationCase;
use App\Models\ModerationStrike;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminModerationCaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_moderation_cases_paginated_latest_first(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $subject = User::factory()->create();

        foreach (range(1, 5) as $index) {
            ModerationCase::create([
                'subject_user_id' => $subject->id,
                'source' => ModerationCase::SOURCE_REPORT,
                'target_type' => 'message',
                'target_id' => 100 + $index,
                'severity' => ModerationCase::SEVERITY_HIGH,
                'status' => ModerationCase::STATUS_OPEN,
                'summary' => "Case {$index}",
                'opened_at' => now()->addMinutes($index),
            ]);
        }

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/moderation/cases?status=open&page=2&per_page=2')
            ->assertOk()
            ->assertJsonPath('data.current_page', 2)
            ->assertJsonPath('data.total', 5)
            ->assertJsonPath('data.data.0.summary', 'Case 3')
            ->assertJsonPath('data.data.1.summary', 'Case 2');
    }

    public function test_admin_can_view_moderation_case_detail_with_evidence(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $reporter = User::factory()->create();
        $subject = User::factory()->create();

        $report = Report::create([
            'reporter_id' => $reporter->id,
            'reported_user_id' => $subject->id,
            'target_type' => 'user',
            'target_id' => $subject->id,
            'reason' => 'Harassment or abuse',
            'details' => 'Repeated abuse.',
            'status' => 'open',
        ]);

        $case = ModerationCase::create([
            'subject_user_id' => $subject->id,
            'opened_by_user_id' => $reporter->id,
            'source' => ModerationCase::SOURCE_REPORT,
            'target_type' => 'user',
            'target_id' => $subject->id,
            'severity' => ModerationCase::SEVERITY_HIGH,
            'status' => ModerationCase::STATUS_OPEN,
            'summary' => 'User report: Harassment or abuse',
            'evidence' => ['report_ids' => [$report->id], 'latest_report_id' => $report->id],
            'opened_at' => now(),
        ]);

        ModerationAction::create([
            'case_id' => $case->id,
            'user_id' => $subject->id,
            'admin_id' => $admin->id,
            'target_type' => 'user',
            'target_id' => $subject->id,
            'action' => ModerationAction::ACTION_WARNING,
            'reason' => 'Warning issued.',
        ]);

        ModerationStrike::create([
            'user_id' => $subject->id,
            'case_id' => $case->id,
            'report_id' => $report->id,
            'issued_by_user_id' => $admin->id,
            'strike_number' => 1,
            'category' => ModerationStrike::CATEGORY_HARASSMENT,
            'severity' => ModerationStrike::SEVERITY_MEDIUM,
            'reason' => 'Confirmed harassment.',
            'active' => true,
        ]);

        ModerationAppeal::create([
            'user_id' => $subject->id,
            'case_id' => $case->id,
            'status' => ModerationAppeal::STATUS_OPEN,
            'appeal_text' => 'Please review the context.',
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/moderation/cases/{$case->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $case->id)
            ->assertJsonPath('data.reports.0.id', $report->id)
            ->assertJsonPath('data.actions.0.action', ModerationAction::ACTION_WARNING)
            ->assertJsonPath('data.strikes.0.category', ModerationStrike::CATEGORY_HARASSMENT)
            ->assertJsonPath('data.appeals.0.status', ModerationAppeal::STATUS_OPEN);
    }

    public function test_admin_can_escalate_case_to_under_review_and_sync_linked_reports(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$case, $report] = $this->createReportBackedCase();

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/moderation/cases/{$case->id}", [
            'status' => ModerationCase::STATUS_UNDER_REVIEW,
            'note' => 'Needs senior review.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', ModerationCase::STATUS_UNDER_REVIEW)
            ->assertJsonPath('data.closed_at', null)
            ->assertJsonPath('data.actions.0.action', ModerationAction::ACTION_CASE_UNDER_REVIEW);

        $this->assertDatabaseHas('moderation_cases', [
            'id' => $case->id,
            'status' => ModerationCase::STATUS_UNDER_REVIEW,
            'assigned_admin_id' => $admin->id,
            'closed_at' => null,
        ]);
        $this->assertDatabaseHas('reports', [
            'id' => $report->id,
            'status' => 'reviewing',
            'reviewed_by' => $admin->id,
        ]);
    }

    public function test_admin_can_dismiss_case_and_close_linked_reports(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$case, $report] = $this->createReportBackedCase();

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/moderation/cases/{$case->id}", [
            'status' => ModerationCase::STATUS_DISMISSED,
            'note' => 'No violation after review.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', ModerationCase::STATUS_DISMISSED)
            ->assertJsonPath('data.actions.0.action', ModerationAction::ACTION_CASE_DISMISSED);

        $this->assertDatabaseHas('moderation_cases', [
            'id' => $case->id,
            'status' => ModerationCase::STATUS_DISMISSED,
            'assigned_admin_id' => $admin->id,
        ]);
        $this->assertNotNull($case->fresh()->closed_at);
        $this->assertDatabaseHas('reports', [
            'id' => $report->id,
            'status' => 'dismissed',
            'action' => 'none',
            'action_note' => 'No violation after review.',
            'reviewed_by' => $admin->id,
        ]);
    }

    public function test_admin_must_add_note_when_closing_case(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$case] = $this->createReportBackedCase();

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/moderation/cases/{$case->id}", [
            'status' => ModerationCase::STATUS_CLOSED,
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'A decision note is required to close or resolve a case.');
    }

    private function createReportBackedCase(): array
    {
        $reporter = User::factory()->create();
        $subject = User::factory()->create();

        $report = Report::create([
            'reporter_id' => $reporter->id,
            'reported_user_id' => $subject->id,
            'target_type' => 'user',
            'target_id' => $subject->id,
            'reason' => 'Harassment or abuse',
            'details' => 'Repeated abuse.',
            'status' => 'open',
        ]);

        $case = ModerationCase::create([
            'subject_user_id' => $subject->id,
            'opened_by_user_id' => $reporter->id,
            'source' => ModerationCase::SOURCE_REPORT,
            'target_type' => 'user',
            'target_id' => $subject->id,
            'severity' => ModerationCase::SEVERITY_HIGH,
            'status' => ModerationCase::STATUS_OPEN,
            'summary' => 'User report: Harassment or abuse',
            'evidence' => ['report_ids' => [$report->id], 'latest_report_id' => $report->id],
            'opened_at' => now(),
        ]);

        return [$case, $report];
    }
}
