<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\ChatThread;
use App\Models\IpRiskEvent;
use App\Models\ReporterRiskScore;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReporterRiskScoringTest extends TestCase
{
    use RefreshDatabase;

    public function test_dismissed_report_increases_reporter_risk(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$reporter, $reported] = [User::factory()->create(), User::factory()->create()];
        $report = $this->createUserReport($reporter, $reported);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/reports/{$report->id}", [
            'status' => 'dismissed',
            'action' => 'none',
            'action_note' => 'No policy issue found.',
        ])->assertOk();

        $this->assertDatabaseHas('reporter_risk_scores', [
            'user_id' => $reporter->id,
            'false_report_count' => 1,
            'valid_report_count' => 0,
            'risk_score' => 10,
        ]);
        $this->assertDatabaseHas('reports', [
            'id' => $report->id,
            'reporter_score_outcome' => 'dismissed_false_report',
        ]);
    }

    public function test_actioned_report_counts_as_valid_without_penalty(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$owner, $winner, $message] = $this->createMessageTarget();

        Sanctum::actingAs($winner);
        $reportId = $this->postJson('/api/reports', [
            'target_type' => 'message',
            'target_id' => $message->id,
            'reason' => 'Harassment or abuse',
        ])->assertCreated()->json('data.id');

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/reports/{$reportId}", [
            'status' => 'resolved',
            'action' => 'hide_content',
            'action_note' => 'Confirmed abusive wording.',
        ])->assertOk();

        $this->assertDatabaseHas('reporter_risk_scores', [
            'user_id' => $winner->id,
            'false_report_count' => 0,
            'valid_report_count' => 1,
            'risk_score' => 0,
        ]);
        $this->assertDatabaseHas('reports', [
            'id' => $reportId,
            'reporter_score_outcome' => 'actioned_valid_report',
        ]);
        $this->assertSame(0, IpRiskEvent::where('event_type', IpRiskEvent::EVENT_FALSE_REPORT_PATTERN)->count());
        $this->assertNotNull($message->fresh()->hidden_at);
        $this->assertNotSame($owner->id, $winner->id);
    }

    public function test_repeated_dismissed_reports_create_ip_risk_event(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $reporter = User::factory()->create();
        $reportedUsers = User::factory()->count(3)->create();

        Sanctum::actingAs($admin);
        foreach ($reportedUsers as $reported) {
            $report = $this->createUserReport($reporter, $reported);
            Sanctum::actingAs($admin);
            $this->patchJson("/api/admin/reports/{$report->id}", [
                'status' => 'dismissed',
                'action' => 'none',
                'action_note' => 'Unsubstantiated report.',
            ])->assertOk();
        }

        $this->assertDatabaseHas('reporter_risk_scores', [
            'user_id' => $reporter->id,
            'false_report_count' => 3,
            'risk_score' => 30,
        ]);
        $this->assertDatabaseHas('ip_risk_events', [
            'user_id' => $reporter->id,
            'ip_address' => '127.0.0.1',
            'event_type' => IpRiskEvent::EVENT_FALSE_REPORT_PATTERN,
            'severity' => IpRiskEvent::SEVERITY_MEDIUM,
            'score' => 6,
        ]);
    }

    private function createUserReport(User $reporter, User $reported): Report
    {
        Sanctum::actingAs($reporter);
        $reportId = $this->postJson('/api/reports', [
            'target_type' => 'user',
            'target_id' => $reported->id,
            'reason' => 'Fake profile',
            'details' => 'This report should be reviewed.',
        ])->assertCreated()->json('data.id');

        return Report::findOrFail($reportId);
    }

    private function createMessageTarget(): array
    {
        $owner = User::factory()->create();
        $winner = User::factory()->create();
        $thread = ChatThread::create([
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
        ]);
        $message = ChatMessage::create([
            'chat_thread_id' => $thread->id,
            'sender_id' => $owner->id,
            'body' => 'Abusive wording',
        ]);

        return [$owner, $winner, $message];
    }
}
