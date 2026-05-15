<?php

namespace Tests\Feature;

use App\Models\ProviderProfile;
use App\Models\SuccessStory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicSuccessStoriesTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_success_stories_only_lists_published_items(): void
    {
        $providerUser = User::factory()->create(['role' => 'provider']);
        $provider = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'company_name' => 'Velvet Table',
            'city' => 'London',
            'country' => 'United Kingdom',
            'is_verified' => true,
        ]);

        SuccessStory::create([
            'provider_profile_id' => $provider->id,
            'title' => 'Dinner became a second date',
            'body' => 'They chose a calm restaurant and had an easy first meet.',
            'attribution' => 'A DateUsher dater',
            'location' => 'London',
            'story_type' => 'provider_date',
            'rating' => 5,
            'status' => SuccessStory::STATUS_PUBLISHED,
            'is_featured' => true,
            'published_at' => now()->subDay(),
        ]);
        SuccessStory::create([
            'title' => 'Draft story',
            'body' => 'Should not be public.',
            'status' => SuccessStory::STATUS_DRAFT,
            'published_at' => now()->subDay(),
        ]);
        SuccessStory::create([
            'title' => 'Future story',
            'body' => 'Should not be public yet.',
            'status' => SuccessStory::STATUS_PUBLISHED,
            'published_at' => now()->addDay(),
        ]);

        $this->getJson('/api/public/success-stories')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.title', 'Dinner became a second date')
            ->assertJsonPath('data.data.0.provider.name', 'Velvet Table')
            ->assertJsonPath('data.data.0.isFeatured', true);
    }

    public function test_public_success_stories_returns_empty_collection_before_launch(): void
    {
        $this->getJson('/api/public/success-stories')
            ->assertOk()
            ->assertJsonCount(0, 'data.data');
    }
}
