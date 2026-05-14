<?php

namespace Tests\Feature;

use App\Models\DeviceFingerprint;
use App\Models\IpRiskEvent;
use App\Models\ReporterRiskScore;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminRiskTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_risky_users(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create([
            'risk_score' => 20,
            'strike_count' => 1,
            'moderation_status' => 'warned',
        ]);

        ReporterRiskScore::create([
            'user_id' => $user->id,
            'false_report_count' => 3,
            'valid_report_count' => 1,
            'risk_score' => 30,
        ]);
        DeviceFingerprint::create([
            'user_id' => $user->id,
            'fingerprint_hash' => hash('sha256', 'install-risky-user'),
            'platform' => 'ios',
            'first_seen_at' => now(),
            'last_seen_at' => now(),
        ]);
        IpRiskEvent::create([
            'user_id' => $user->id,
            'ip_address' => '203.0.113.10',
            'event_type' => IpRiskEvent::EVENT_FALSE_REPORT_PATTERN,
            'severity' => IpRiskEvent::SEVERITY_MEDIUM,
            'score' => 6,
            'occurred_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/risk/users?per_page=10')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $user->id)
            ->assertJsonPath('data.data.0.user_risk_score', 20)
            ->assertJsonPath('data.data.0.reporter_risk_score', 30)
            ->assertJsonPath('data.data.0.device_count', 1)
            ->assertJsonPath('data.data.0.ip_risk_events_count', 1);
    }

    public function test_admin_can_filter_ip_risk_events(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();

        IpRiskEvent::create([
            'user_id' => $user->id,
            'ip_address' => '203.0.113.20',
            'event_type' => IpRiskEvent::EVENT_REPORT_RATE_LIMIT,
            'severity' => IpRiskEvent::SEVERITY_MEDIUM,
            'score' => 5,
            'occurred_at' => now(),
        ]);
        IpRiskEvent::create([
            'user_id' => $user->id,
            'ip_address' => '198.51.100.20',
            'event_type' => IpRiskEvent::EVENT_APPEAL_RATE_LIMIT,
            'severity' => IpRiskEvent::SEVERITY_MEDIUM,
            'score' => 4,
            'occurred_at' => now()->subMinute(),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/risk/ip-events?event_type=report_rate_limit&ip=203.0.113')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.event_type', IpRiskEvent::EVENT_REPORT_RATE_LIMIT)
            ->assertJsonPath('data.data.0.user.id', $user->id);
    }

    public function test_admin_can_view_user_risk_detail(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create(['risk_score' => 12]);

        DeviceFingerprint::create([
            'user_id' => $user->id,
            'fingerprint_hash' => hash('sha256', 'install-detail-user'),
            'platform' => 'android',
            'device_model' => 'Pixel',
            'first_seen_at' => now(),
            'last_seen_at' => now(),
        ]);
        IpRiskEvent::create([
            'user_id' => $user->id,
            'ip_address' => '203.0.113.30',
            'event_type' => IpRiskEvent::EVENT_APPEAL_RATE_LIMIT,
            'severity' => IpRiskEvent::SEVERITY_MEDIUM,
            'score' => 4,
            'occurred_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/users/{$user->id}/risk")
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.recent_devices.0.platform', 'android')
            ->assertJsonPath('data.recent_ip_events.0.event_type', IpRiskEvent::EVENT_APPEAL_RATE_LIMIT);
    }
}
