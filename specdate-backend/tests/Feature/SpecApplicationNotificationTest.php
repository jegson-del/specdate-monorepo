<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Spec;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SpecApplicationNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_participant_is_notified_when_spec_application_is_accepted(): void
    {
        $owner = User::factory()->create();
        $participant = User::factory()->create();
        $spec = Spec::create([
            'user_id' => $owner->id,
            'title' => 'Coffee quest',
            'description' => 'Find a date',
            'expires_at' => now()->addDays(3),
            'max_participants' => 2,
            'status' => 'OPEN',
        ]);
        $application = $spec->applications()->create([
            'user_id' => $participant->id,
            'user_role' => 'participant',
            'status' => 'PENDING',
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/specs/{$spec->id}/applications/{$application->id}/approve")
            ->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $participant->id,
            'type' => 'application_accepted',
        ]);

        $notification = Notification::where('user_id', $participant->id)
            ->where('type', 'application_accepted')
            ->firstOrFail();

        $this->assertSame($spec->id, $notification->data['spec_id']);
        $this->assertSame('Coffee quest', $notification->data['spec_title']);
    }
}
