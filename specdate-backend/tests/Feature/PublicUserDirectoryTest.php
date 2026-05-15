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
                'country_code' => 'GB',
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
            ->assertJsonPath('data.data.0.country_code', 'GB')
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
            'country_code' => 'GB',
            'sex' => 'Female',
            'occupation' => 'Product Designer',
        ]);

        UserProfile::create([
            'user_id' => $lagosUser->id,
            'full_name' => 'Lagos Match',
            'city' => 'Lagos',
            'country' => 'Nigeria',
            'country_code' => 'NG',
            'sex' => 'Female',
            'occupation' => 'Product Designer',
        ]);

        Sanctum::actingAs($viewer);

        $this->getJson('/api/users?country=United&city=London&sex=Female&query=designer&per_page=10')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.name', 'London Match')
            ->assertJsonPath('data.data.0.city', 'London')
            ->assertJsonPath('data.data.0.country', 'United Kingdom')
            ->assertJsonPath('data.data.0.country_code', 'GB');
    }

    public function test_people_directory_filter_options_return_visible_counts(): void
    {
        $viewer = User::factory()->create();
        $londonUser = User::factory()->create(['name' => 'London Date']);
        $manchesterUser = User::factory()->create(['name' => 'Manchester Date']);
        $lagosUser = User::factory()->create(['name' => 'Lagos Date']);
        $pausedUser = User::factory()->create(['is_paused' => true]);
        $provider = User::factory()->create(['role' => 'provider']);

        UserProfile::create([
            'user_id' => $londonUser->id,
            'full_name' => 'London Date',
            'city' => 'London',
            'country' => 'United Kingdom',
            'country_code' => 'GB',
            'sex' => 'Female',
        ]);
        UserProfile::create([
            'user_id' => $manchesterUser->id,
            'full_name' => 'Manchester Date',
            'city' => 'Manchester',
            'country' => 'United Kingdom',
            'country_code' => 'GB',
            'sex' => 'Female',
        ]);
        UserProfile::create([
            'user_id' => $lagosUser->id,
            'full_name' => 'Lagos Date',
            'city' => 'Lagos',
            'country' => 'Nigeria',
            'country_code' => 'NG',
            'sex' => 'Male',
        ]);
        UserProfile::create([
            'user_id' => $pausedUser->id,
            'city' => 'Hidden City',
            'country' => 'Hidden Country',
            'country_code' => 'HC',
            'sex' => 'Female',
        ]);
        UserProfile::create([
            'user_id' => $provider->id,
            'city' => 'Provider City',
            'country' => 'Provider Country',
            'country_code' => 'PC',
            'sex' => 'Female',
        ]);

        Sanctum::actingAs($viewer);

        $this->getJson('/api/users/filter-options?sex=Female&country=United%20Kingdom')
            ->assertOk()
            ->assertJsonCount(1, 'data.countries')
            ->assertJsonPath('data.countries.0.name', 'United Kingdom')
            ->assertJsonPath('data.countries.0.code', 'GB')
            ->assertJsonPath('data.countries.0.count', 2)
            ->assertJsonCount(2, 'data.cities')
            ->assertJsonPath('data.cities.0.name', 'London')
            ->assertJsonPath('data.cities.0.count', 1)
            ->assertJsonPath('data.cities.1.name', 'Manchester')
            ->assertJsonPath('data.cities.1.count', 1);
    }
}
