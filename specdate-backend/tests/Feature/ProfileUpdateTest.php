<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_edit_username_and_profile_full_name_separately(): void
    {
        $user = User::factory()->create([
            'name' => 'oldalias',
            'username' => 'oldalias',
        ]);
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', [
            'username' => 'newalias',
            'full_name' => 'Real Person',
        ])->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'username' => 'newalias',
            'name' => 'newalias',
        ]);
        $this->assertDatabaseHas('user_profiles', [
            'user_id' => $user->id,
            'full_name' => 'Real Person',
        ]);
    }

    public function test_username_update_must_be_unique(): void
    {
        User::factory()->create(['username' => 'takenalias']);
        $user = User::factory()->create(['username' => 'availablealias']);
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', [
            'username' => 'takenalias',
            'full_name' => 'Real Person',
        ])->assertUnprocessable()
            ->assertJsonPath('data.errors.username.0', 'The username has already been taken.');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'username' => 'availablealias',
        ]);
    }

    public function test_working_occupation_requires_job_title_for_profile_completion(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $payload = $this->completeProfilePayload([
            'occupation' => 'Self-employed',
            'job_title' => '',
        ]);

        $this->putJson('/api/profile', $payload)->assertOk();
        $this->assertFalse($user->fresh('profile')->profile_complete);

        $this->putJson('/api/profile', $this->completeProfilePayload([
            'occupation' => 'Self-employed',
            'job_title' => 'Designer',
        ]))->assertOk();
        $this->assertTrue($user->fresh('profile')->profile_complete);
    }

    public function test_student_or_unemployed_profile_does_not_require_job_title(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', $this->completeProfilePayload([
            'occupation' => 'Student',
            'job_title' => '',
        ]))->assertOk();

        $profile = $user->fresh('profile')->profile;
        $this->assertTrue($user->fresh('profile')->profile_complete);
        $this->assertNull($profile->job_title);
    }

    private function completeProfilePayload(array $overrides = []): array
    {
        return array_merge([
            'username' => 'profileuser',
            'full_name' => 'Real Person',
            'dob' => now()->subYears(25)->toDateString(),
            'sex' => 'Female',
            'city' => 'London',
            'state' => 'England',
            'country' => 'United Kingdom',
            'occupation' => 'Employed (Private)',
            'job_title' => 'Engineer',
            'qualification' => 'Bachelor',
            'sexual_orientation' => 'Heterosexual',
            'hobbies' => 'Reading and cooking',
            'is_smoker' => false,
            'is_drug_user' => false,
        ], $overrides);
    }
}
