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

class PostDateReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_provider_can_record_optional_spend_when_redeeming_voucher_and_users_get_review_prompt(): void
    {
        [$owner, $winner, $provider, $voucher] = $this->redeemableVoucher();

        Sanctum::actingAs($provider);

        $this->postJson('/api/provider/scan-qr', [
            'code' => $voucher->qr_token,
            'total_spent' => 32000,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', DateVoucher::STATUS_REDEEMED)
            ->assertJsonPath('data.total_spent', 32000);

        $this->assertDatabaseHas('date_vouchers', [
            'id' => $voucher->id,
            'status' => DateVoucher::STATUS_REDEEMED,
            'total_spent' => '32000.00',
        ]);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => 'voucher_redeemed',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $winner->id,
            'type' => 'voucher_redeemed',
        ]);
    }

    public function test_redeemed_voucher_can_collect_provider_and_partner_reviews(): void
    {
        [$owner, , $provider, $voucher] = $this->redeemableVoucher();
        $voucher->update([
            'status' => DateVoucher::STATUS_REDEEMED,
            'redeemed_at' => now(),
            'redeemed_by_provider_user_id' => $provider->id,
        ]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/date-vouchers/{$voucher->id}/review-context")
            ->assertOk()
            ->assertJsonPath('data.voucher.id', $voucher->id)
            ->assertJsonPath('data.provider.name', 'Review Lounge')
            ->assertJsonPath('data.reviews.is_complete', false);

        $this->postJson("/api/date-vouchers/{$voucher->id}/provider-review", [
            'rating' => 5,
            'comment' => 'Great venue and easy voucher process.',
        ])->assertOk()
            ->assertJsonPath('data.rating', 5);

        $this->postJson("/api/date-vouchers/{$voucher->id}/partner-review", [
            'rating' => 4,
            'chemistry_rating' => 4,
            'safety_rating' => 5,
            'would_meet_again' => true,
            'comment' => 'Respectful and easy to talk to.',
        ])->assertOk()
            ->assertJsonPath('data.rating', 4);

        $this->assertDatabaseHas('provider_reviews', [
            'date_voucher_id' => $voucher->id,
            'reviewer_id' => $owner->id,
            'rating' => 5,
        ]);
        $this->assertDatabaseHas('date_partner_reviews', [
            'date_voucher_id' => $voucher->id,
            'reviewer_id' => $owner->id,
            'rating' => 4,
            'would_meet_again' => true,
        ]);
    }

    public function test_user_can_dismiss_redeemed_voucher_review_prompt(): void
    {
        [$owner, , $provider, $voucher] = $this->redeemableVoucher();
        $voucher->update([
            'status' => DateVoucher::STATUS_REDEEMED,
            'redeemed_at' => now(),
            'redeemed_by_provider_user_id' => $provider->id,
        ]);

        Sanctum::actingAs($owner);

        $this->getJson('/api/review-prompts')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->postJson("/api/date-vouchers/{$voucher->id}/review-dismiss")
            ->assertOk();

        $this->getJson('/api/review-prompts')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    private function redeemableVoucher(): array
    {
        $owner = User::factory()->create();
        $winner = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);
        $profile = ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => 'Review Lounge',
            'discount_percentage' => 20,
        ]);
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
            'date_code' => 'REV123',
        ]);
        $voucher = DateVoucher::create([
            'spec_date_id' => $date->id,
            'provider_profile_id' => $profile->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
            'requested_by_user_id' => $owner->id,
            'voucher_code' => 'DU-REVIEW',
            'qr_token' => 'review-token',
            'discount_percentage' => 20,
            'booking_required' => false,
            'status' => DateVoucher::STATUS_ACTIVE,
            'expires_at' => now()->addDays(30),
        ]);

        return [$owner, $winner, $provider, $voucher];
    }
}
