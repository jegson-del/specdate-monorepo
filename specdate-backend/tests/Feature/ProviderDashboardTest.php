<?php

namespace Tests\Feature;

use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
