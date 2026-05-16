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
}
