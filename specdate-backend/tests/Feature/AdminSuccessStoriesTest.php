<?php

namespace Tests\Feature;

use App\Models\AdminAccess;
use App\Models\ProviderProfile;
use App\Models\SuccessStory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSuccessStoriesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_success_stories_require_access(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        AdminAccess::create([
            'admin_id' => $admin->id,
            'can_manage_success_stories' => false,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/success-stories')
            ->assertForbidden()
            ->assertJsonPath('message', 'Admin success story access required.');
    }

    public function test_admin_can_create_update_and_delete_success_story(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        AdminAccess::create([
            'admin_id' => $admin->id,
            'can_manage_success_stories' => true,
        ]);
        $providerUser = User::factory()->create(['role' => 'provider']);
        $provider = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'company_name' => 'Velvet Table',
            'is_verified' => true,
        ]);

        Sanctum::actingAs($admin);

        $createResponse = $this->postJson('/api/admin/success-stories', [
            'provider_profile_id' => $provider->id,
            'title' => 'Dinner became a second date',
            'body' => 'They met somewhere calm and stayed longer than planned.',
            'attribution' => 'A DateUsher dater',
            'location' => 'London',
            'story_type' => 'provider_date',
            'rating' => 5,
            'status' => 'draft',
        ])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Dinner became a second date')
            ->assertJsonPath('data.provider.name', 'Velvet Table');

        $storyId = $createResponse->json('data.id');

        $this->patchJson("/api/admin/success-stories/{$storyId}", [
            'status' => 'published',
            'is_featured' => true,
            'sort_order' => 1,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.is_featured', true);

        $this->getJson('/api/admin/success-stories?status=published')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $storyId);

        $this->getJson('/api/public/success-stories')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $storyId);

        $this->deleteJson("/api/admin/success-stories/{$storyId}")
            ->assertOk()
            ->assertJsonPath('message', 'Success story deleted.');

        $this->assertDatabaseMissing('success_stories', ['id' => $storyId]);
    }

    public function test_admin_story_validation_rejects_invalid_publish_payload(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        AdminAccess::create([
            'admin_id' => $admin->id,
            'can_manage_success_stories' => true,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/success-stories', [
            'title' => 'No',
            'body' => 'Too short',
            'rating' => 8,
            'status' => 'live',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'body', 'rating', 'status']);

        $this->assertDatabaseCount('success_stories', 0);
    }
}
