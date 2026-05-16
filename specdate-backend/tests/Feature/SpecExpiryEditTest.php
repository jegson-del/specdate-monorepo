<?php

namespace Tests\Feature;

use App\Models\Spec;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SpecExpiryEditTest extends TestCase
{
    use RefreshDatabase;

    public function test_spec_create_duration_allows_up_to_thirty_days(): void
    {
        $owner = User::factory()->create();
        $owner->balance()->create(['credits' => 1]);

        Sanctum::actingAs($owner);

        $this->postJson('/api/specs', [
            'title' => 'Thirty day spec',
            'description' => 'A controlled duration.',
            'duration' => 30,
            'max_participants' => 10,
        ])->assertCreated();

        $this->assertDatabaseHas('user_balances', [
            'user_id' => $owner->id,
            'credits' => 0,
        ]);
    }

    public function test_spec_edit_rejects_free_typed_expires_at(): void
    {
        $owner = User::factory()->create();
        $spec = $this->specFor($owner, now()->addDays(3));

        Sanctum::actingAs($owner);

        $this->putJson("/api/specs/{$spec->id}", [
            'expires_at' => now()->addYear()->toISOString(),
        ])->assertUnprocessable();
    }

    public function test_owner_can_use_one_normal_expiry_extension(): void
    {
        $owner = User::factory()->create();
        $spec = $this->specFor($owner, now()->addDays(3));

        Sanctum::actingAs($owner);

        $this->putJson("/api/specs/{$spec->id}", [
            'duration' => 7,
        ])->assertOk();

        $spec->refresh();
        $this->assertSame(1, $spec->expiry_extension_count);
        $this->assertTrue($spec->expires_at->between(now()->addDays(6)->subMinute(), now()->addDays(7)->addMinute()));

        $this->putJson("/api/specs/{$spec->id}", [
            'duration' => 8,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'This spec has already used its normal expiry extension.');
    }

    public function test_pending_applicants_can_only_extend_by_seven_days_and_not_shorten(): void
    {
        $owner = User::factory()->create();
        $applicant = User::factory()->create();
        $spec = $this->specFor($owner, now()->addDays(3));
        $spec->applications()->create([
            'user_id' => $applicant->id,
            'user_role' => 'participant',
            'status' => 'PENDING',
        ]);

        Sanctum::actingAs($owner);

        $this->putJson("/api/specs/{$spec->id}", [
            'duration' => 2,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Expiry cannot be shortened after people have applied or joined.');

        $this->putJson("/api/specs/{$spec->id}", [
            'duration' => 11,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Specs with pending applicants can only be extended by up to 7 days.');

        $this->putJson("/api/specs/{$spec->id}", [
            'duration' => 9,
        ])->assertOk();
    }

    public function test_accepted_participants_require_paid_extend_search_flow(): void
    {
        $owner = User::factory()->create();
        $participant = User::factory()->create();
        $spec = $this->specFor($owner, now()->addDays(3));
        $spec->applications()->create([
            'user_id' => $participant->id,
            'user_role' => 'participant',
            'status' => 'ACCEPTED',
        ]);

        Sanctum::actingAs($owner);

        $this->putJson("/api/specs/{$spec->id}", [
            'duration' => 7,
        ])->assertStatus(402)
            ->assertJsonPath('message', 'Accepted or matched participants require the paid extend-search flow.');
    }

    public function test_max_participants_uses_creation_options_and_cannot_drop_below_open_applicants(): void
    {
        $owner = User::factory()->create();
        $spec = $this->specFor($owner, now()->addDays(3));

        Sanctum::actingAs($owner);

        $this->putJson("/api/specs/{$spec->id}", [
            'max_participants' => 2,
        ])->assertUnprocessable();

        User::factory()
            ->count(11)
            ->create()
            ->each(fn (User $applicant) => $spec->applications()->create([
                'user_id' => $applicant->id,
                'user_role' => 'participant',
                'status' => 'PENDING',
            ]));

        $this->putJson("/api/specs/{$spec->id}", [
            'max_participants' => 10,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Max participants cannot be lower than the people already pending or accepted.');

        $this->putJson("/api/specs/{$spec->id}", [
            'max_participants' => 20,
        ])->assertOk();
    }

    private function specFor(User $owner, $expiresAt): Spec
    {
        return Spec::create([
            'user_id' => $owner->id,
            'title' => 'Editable spec',
            'description' => 'Testing expiry edits.',
            'expires_at' => $expiresAt,
            'max_participants' => 2,
            'status' => 'OPEN',
        ]);
    }
}
