<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProviderDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_provider_dashboard_uses_profile_discount_percentage(): void
    {
        $provider = User::factory()->create(['role' => 'provider']);
        ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => 'Table House',
            'discount_percentage' => 20,
            'minimum_spend' => 15000,
            'currency' => 'GBP',
            'booking_required' => true,
        ]);

        Sanctum::actingAs($provider);

        $this->getJson('/api/provider/dashboard')
            ->assertOk()
            ->assertJsonPath('profile.discount_percentage', 20)
            ->assertJsonPath('profile.minimum_spend', '15000.00')
            ->assertJsonPath('profile.currency', 'GBP')
            ->assertJsonPath('profile.booking_required', true)
            ->assertJsonPath('counts.unread_messages', 0)
            ->assertJsonPath('counts.pending_bookings', 0)
            ->assertJsonPath('upcoming_bookings', [])
            ->assertJsonMissingPath('discounts')
            ->assertJsonMissingPath('stats');
    }

    public function test_provider_can_update_booking_terms(): void
    {
        $provider = User::factory()->create(['role' => 'provider']);
        ProviderProfile::create([
            'user_id' => $provider->id,
            'discount_percentage' => 10,
        ]);

        Sanctum::actingAs($provider);

        $this->postJson('/api/provider/settings', [
            'company_name' => 'Table House',
            'country' => 'Nigeria',
            'currency' => 'NGN',
            'discount_percentage' => 25,
            'minimum_spend' => 12000,
            'booking_required' => true,
        ])
            ->assertOk()
            ->assertJsonPath('profile.discount_percentage', 25)
            ->assertJsonPath('profile.minimum_spend', '12000.00')
            ->assertJsonPath('profile.currency', 'NGN')
            ->assertJsonPath('profile.booking_required', true);
    }

    public function test_provider_qr_scan_waits_for_date_vouchers(): void
    {
        $provider = User::factory()->create(['role' => 'provider']);

        Sanctum::actingAs($provider);

        $this->postJson('/api/provider/scan-qr', ['code' => 'ANY-CODE'])
            ->assertNotFound();
    }

    public function test_provider_can_replace_gallery_media_by_id(): void
    {
        Storage::fake('public');
        config(['filesystems.default' => 'public']);

        $provider = User::factory()->create(['role' => 'provider']);
        $media = Media::create([
            'user_id' => $provider->id,
            'file_path' => 'uploads/provider/old.jpg',
            'url' => 'http://localhost/storage/uploads/provider/old.jpg',
            'type' => 'provider_gallery',
            'mime_type' => 'image/jpeg',
            'size' => 123,
            'moderation_status' => 'approved',
        ]);

        Sanctum::actingAs($provider);

        $this->post('/api/media/upload', [
            'type' => 'provider_gallery',
            'media_id' => $media->id,
            'file' => UploadedFile::fake()->create('new.jpg', 100, 'image/jpeg'),
        ])->assertCreated()
            ->assertJsonPath('data.id', $media->id)
            ->assertJsonPath('data.type', 'provider_gallery');

        $this->assertSame(1, Media::where('user_id', $provider->id)->where('type', 'provider_gallery')->count());
        $this->assertNotSame('uploads/provider/old.jpg', $media->fresh()->file_path);
    }
}
