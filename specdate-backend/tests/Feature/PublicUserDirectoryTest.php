<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublicUserDirectoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_people_directory_is_paginated_and_returns_public_profile_fields(): void
    {
        $viewer = User::factory()->create();

        foreach (range(1, 3) as $index) {
            $user = User::factory()->create([
                'name' => "Person {$index}",
                'created_at' => now()->addMinutes($index),
                'updated_at' => now()->addMinutes($index),
            ]);

            UserProfile::create([
                'user_id' => $user->id,
                'full_name' => "Public Person {$index}",
                'city' => 'London',
                'country' => 'United Kingdom',
                'sex' => $index === 1 ? 'Male' : 'Female',
                'occupation' => 'Designer',
            ]);
        }

        Sanctum::actingAs($viewer);

        $this->getJson('/api/users?per_page=2')
            ->assertOk()
            ->assertJsonPath('data.current_page', 1)
            ->assertJsonPath('data.last_page', 2)
            ->assertJsonPath('data.total', 3)
            ->assertJsonPath('data.per_page', 2)
            ->assertJsonPath('data.data.0.name', 'Public Person 3')
            ->assertJsonPath('data.data.0.country', 'United Kingdom')
            ->assertJsonPath('data.data.0.occupation', 'Designer');
    }

    public function test_people_directory_can_filter_by_country_city_sex_and_search(): void
    {
        $viewer = User::factory()->create();
        $londonUser = User::factory()->create(['name' => 'Visible Match']);
        $lagosUser = User::factory()->create(['name' => 'Hidden Match']);

        UserProfile::create([
            'user_id' => $londonUser->id,
            'full_name' => 'London Match',
            'city' => 'London',
            'country' => 'United Kingdom',
            'sex' => 'Female',
            'occupation' => 'Product Designer',
        ]);

        UserProfile::create([
            'user_id' => $lagosUser->id,
            'full_name' => 'Lagos Match',
            'city' => 'Lagos',
            'country' => 'Nigeria',
            'sex' => 'Female',
            'occupation' => 'Product Designer',
        ]);

        Sanctum::actingAs($viewer);

        $this->getJson('/api/users?country=United&city=London&sex=Female&query=designer&per_page=10')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.name', 'London Match')
            ->assertJsonPath('data.data.0.city', 'London')
            ->assertJsonPath('data.data.0.country', 'United Kingdom');
    }
}
