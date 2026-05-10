<?php

namespace Tests\Feature;

use App\Models\DateVoucher;
use App\Models\ProviderProfile;
use App\Models\Spec;
use App\Models\SpecDate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DateVoucherTest extends TestCase
{
    use RefreshDatabase;

    public function test_matched_user_can_preview_and_create_provider_voucher(): void
    {
        [$owner, $winner, $date] = $this->createSpecDate();
        $provider = User::factory()->create(['role' => 'provider']);
        $profile = ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => 'Table House',
            'discount_percentage' => 25,
            'minimum_spend' => 15000,
            'booking_required' => true,
        ]);

        Sanctum::actingAs($winner);

        $this->postJson('/api/date-vouchers/preview', [
            'date_code' => $date->date_code,
            'provider_profile_id' => $profile->id,
        ])->assertOk()
            ->assertJsonPath('data.provider.id', $profile->id)
            ->assertJsonPath('data.voucher_terms.discount_percentage', 25)
            ->assertJsonPath('data.voucher_terms.initial_status', DateVoucher::STATUS_PENDING_PROVIDER);

        $voucherId = $this->postJson('/api/date-vouchers', [
            'date_code' => $date->date_code,
            'provider_profile_id' => $profile->id,
        ])->assertCreated()
            ->assertJsonPath('data.provider_profile_id', $profile->id)
            ->assertJsonPath('data.owner_id', $owner->id)
            ->assertJsonPath('data.winner_user_id', $winner->id)
            ->assertJsonPath('data.status', DateVoucher::STATUS_PENDING_PROVIDER)
            ->assertJsonPath('data.discount_percentage', 25)
            ->json('data.id');

        $this->assertDatabaseHas('date_vouchers', [
            'id' => $voucherId,
            'spec_date_id' => $date->id,
            'provider_profile_id' => $profile->id,
            'status' => DateVoucher::STATUS_PENDING_PROVIDER,
        ]);
    }

    public function test_provider_can_approve_and_redeem_active_voucher(): void
    {
        [, $winner, $date] = $this->createSpecDate();
        $provider = User::factory()->create(['role' => 'provider']);
        $profile = ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => 'Table House',
            'discount_percentage' => 20,
            'booking_required' => true,
        ]);

        Sanctum::actingAs($winner);
        $voucher = $this->postJson('/api/date-vouchers', [
            'date_code' => $date->date_code,
            'provider_profile_id' => $profile->id,
        ])->assertCreated()->json('data');

        Sanctum::actingAs($provider);
        $this->getJson('/api/provider/bookings')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $voucher['id']);

        $this->postJson("/api/provider/bookings/{$voucher['id']}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', DateVoucher::STATUS_ACTIVE);

        $this->postJson('/api/provider/scan-qr', ['code' => $voucher['qr_token']])
            ->assertOk()
            ->assertJsonPath('data.status', DateVoucher::STATUS_REDEEMED);

        $this->assertDatabaseHas('spec_dates', [
            'id' => $date->id,
            'status' => SpecDate::STATUS_COMPLETED,
        ]);

        $this->postJson('/api/provider/scan-qr/preview', ['code' => $voucher['qr_token']])
            ->assertOk()
            ->assertJsonPath('data.status', DateVoucher::STATUS_REDEEMED);
    }

    public function test_duplicate_unfinished_voucher_for_same_provider_is_blocked(): void
    {
        [, $winner, $date] = $this->createSpecDate();
        $provider = User::factory()->create(['role' => 'provider']);
        $profile = ProviderProfile::create([
            'user_id' => $provider->id,
            'discount_percentage' => 10,
        ]);

        Sanctum::actingAs($winner);

        $payload = [
            'date_code' => $date->date_code,
            'provider_profile_id' => $profile->id,
        ];

        $this->postJson('/api/date-vouchers', $payload)->assertCreated();
        $this->postJson('/api/date-vouchers', $payload)
            ->assertStatus(422)
            ->assertJsonPath('message', 'You already have an active voucher request for this provider.');
    }

    public function test_user_cannot_use_someone_elses_date_code(): void
    {
        [, , $date] = $this->createSpecDate();
        $stranger = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);
        $profile = ProviderProfile::create([
            'user_id' => $provider->id,
            'discount_percentage' => 10,
        ]);

        Sanctum::actingAs($stranger);

        $this->postJson('/api/date-vouchers', [
            'date_code' => $date->date_code,
            'provider_profile_id' => $profile->id,
        ])->assertStatus(403)
            ->assertJsonPath('message', 'This date code does not belong to you.');
    }

    private function createSpecDate(): array
    {
        $owner = User::factory()->create();
        $winner = User::factory()->create();
        $spec = Spec::create([
            'user_id' => $owner->id,
            'title' => 'Dinner quest',
            'description' => 'Find a date',
            'expires_at' => now()->addDays(3),
            'max_participants' => 2,
            'status' => 'COMPLETED',
        ]);
        $date = SpecDate::create([
            'spec_id' => $spec->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
            'date_code' => 'ABC123',
        ]);

        return [$owner, $winner, $date];
    }
}
