<?php

namespace Tests\Feature;

use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\IpRiskEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ModerationRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_report_submission_is_rate_limited(): void
    {
        $reporter = User::factory()->create();
        $reported = User::factory()->create();
        Sanctum::actingAs($reporter);

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/reports', [
                'target_type' => 'user',
                'target_id' => $reported->id,
                'reason' => 'Spam or scam',
                'details' => "Repeated suspicious behavior {$i}",
            ])->assertCreated();
        }

        $this->postJson('/api/reports', [
            'target_type' => 'user',
            'target_id' => $reported->id,
            'reason' => 'Spam or scam',
            'details' => 'One more report in the same minute.',
        ])->assertTooManyRequests()
            ->assertJsonPath('message', 'Too many reports submitted. Please wait before reporting again.');

        $this->assertDatabaseHas('ip_risk_events', [
            'user_id' => $reporter->id,
            'event_type' => IpRiskEvent::EVENT_REPORT_RATE_LIMIT,
            'severity' => IpRiskEvent::SEVERITY_MEDIUM,
            'score' => 5,
            'method' => 'POST',
            'path' => 'api/reports',
        ]);
    }

    public function test_appeal_submission_is_rate_limited(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $actions = collect(range(1, 6))->map(fn (int $index) => $this->appealableAction($user, $index));

        foreach ($actions->take(5) as $action) {
            $this->postJson('/api/moderation/appeals', [
                'action_id' => $action->id,
                'appeal_text' => 'Please review this moderation decision with the added context.',
            ])->assertCreated();
        }

        $this->postJson('/api/moderation/appeals', [
            'action_id' => $actions->last()->id,
            'appeal_text' => 'Please review this moderation decision with the added context.',
        ])->assertTooManyRequests()
            ->assertJsonPath('message', 'Too many appeals submitted. Please wait before submitting another appeal.');

        $this->assertDatabaseHas('ip_risk_events', [
            'user_id' => $user->id,
            'event_type' => IpRiskEvent::EVENT_APPEAL_RATE_LIMIT,
            'severity' => IpRiskEvent::SEVERITY_MEDIUM,
            'score' => 4,
            'method' => 'POST',
            'path' => 'api/moderation/appeals',
        ]);
    }

    private function appealableAction(User $user, int $index): ModerationAction
    {
        $case = ModerationCase::create([
            'subject_user_id' => $user->id,
            'source' => ModerationCase::SOURCE_REPORT,
            'target_type' => 'message',
            'target_id' => 1000 + $index,
            'severity' => ModerationCase::SEVERITY_LOW,
            'status' => ModerationCase::STATUS_ACTIONED,
            'summary' => "Moderation action {$index}",
            'opened_at' => now(),
        ]);

        return ModerationAction::create([
            'case_id' => $case->id,
            'user_id' => $user->id,
            'target_type' => 'message',
            'target_id' => 1000 + $index,
            'action' => ModerationAction::ACTION_WARNING,
            'reason' => "Warning action {$index}",
            'metadata' => [],
        ]);
    }
}
