<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\ProviderCategory;
use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProviderMarketplaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_provider_marketplace_lists_real_provider_profiles(): void
    {
        $dater = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider', 'name' => 'Provider Owner']);
        $category = ProviderCategory::create(['name' => 'Restaurant', 'slug' => 'restaurant']);
        $profile = ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => 'Table House',
            'description' => 'A calm place for date night.',
            'city' => 'Lagos',
            'country' => 'Nigeria',
            'address' => '12 Date Street',
            'discount_percentage' => 20,
            'minimum_spend' => 15000,
            'booking_required' => true,
            'is_verified' => true,
        ]);
        $profile->categories()->attach($category->id);
        Media::create([
            'user_id' => $provider->id,
            'file_path' => 'uploads/provider.jpg',
            'url' => 'https://example.com/provider.jpg',
            'type' => 'avatar',
            'mime_type' => 'image/jpeg',
            'size' => 100,
        ]);

        Sanctum::actingAs($dater);

        $this->getJson('/api/providers')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $profile->id)
            ->assertJsonPath('data.data.0.user_id', $provider->id)
            ->assertJsonPath('data.data.0.name', 'Table House')
            ->assertJsonPath('data.data.0.category', 'Restaurant')
            ->assertJsonPath('data.data.0.imageUrl', 'https://example.com/provider.jpg')
            ->assertJsonPath('data.data.0.discountPercentage', 20)
            ->assertJsonPath('data.data.0.minimumSpend', 15000)
            ->assertJsonPath('data.data.0.bookingRequired', true)
            ->assertJsonPath('data.data.0.isVerified', true);
    }

    public function test_provider_detail_returns_gallery_and_voucher_ready_ids(): void
    {
        $dater = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);
        $profile = ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => 'Gallery Lounge',
            'discount_percentage' => 15,
        ]);
        Media::create([
            'user_id' => $provider->id,
            'file_path' => 'uploads/gallery.jpg',
            'url' => 'https://example.com/gallery.jpg',
            'type' => 'provider_gallery',
            'mime_type' => 'image/jpeg',
            'size' => 100,
        ]);

        Sanctum::actingAs($dater);

        $this->getJson("/api/providers/{$profile->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $profile->id)
            ->assertJsonPath('data.user_id', $provider->id)
            ->assertJsonPath('data.gallery.0.url', 'https://example.com/gallery.jpg')
            ->assertJsonPath('data.imageUrl', 'https://example.com/gallery.jpg');
    }
}
