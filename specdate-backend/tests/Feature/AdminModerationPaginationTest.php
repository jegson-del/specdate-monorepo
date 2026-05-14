<?php

namespace Tests\Feature;

use App\Models\ModerationAppeal;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminModerationPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_reports_are_paginated_latest_first(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $reporter = User::factory()->create();
        $reported = User::factory()->create();

        foreach (range(1, 5) as $index) {
            Report::create([
                'reporter_id' => $reporter->id,
                'reported_user_id' => $reported->id,
                'target_type' => 'user',
                'target_id' => $reported->id,
                'reason' => "Report {$index}",
                'status' => 'open',
                'created_at' => now()->addMinutes($index),
                'updated_at' => now()->addMinutes($index),
            ]);
        }

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/reports?status=open&page=2&per_page=2')
            ->assertOk()
            ->assertJsonPath('data.current_page', 2)
            ->assertJsonPath('data.per_page', 2)
            ->assertJsonPath('data.total', 5)
            ->assertJsonPath('data.data.0.reason', 'Report 3')
            ->assertJsonPath('data.data.1.reason', 'Report 2');
    }

    public function test_admin_appeals_are_paginated_latest_first(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();

        foreach (range(1, 5) as $index) {
            ModerationAppeal::create([
                'user_id' => $user->id,
                'status' => ModerationAppeal::STATUS_OPEN,
                'appeal_text' => "Appeal text {$index}",
                'submitted_at' => now()->addMinutes($index),
            ]);
        }

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/moderation/appeals?status=open&page=2&per_page=2')
            ->assertOk()
            ->assertJsonPath('data.current_page', 2)
            ->assertJsonPath('data.per_page', 2)
            ->assertJsonPath('data.total', 5)
            ->assertJsonPath('data.data.0.appeal_text', 'Appeal text 3')
            ->assertJsonPath('data.data.1.appeal_text', 'Appeal text 2');
    }
}
