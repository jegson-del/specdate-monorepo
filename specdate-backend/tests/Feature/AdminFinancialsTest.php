<?php

namespace Tests\Feature;

use App\Models\DateVoucher;
use App\Models\ProviderProfile;
use App\Models\Spec;
use App\Models\SpecDate;
use App\Models\User;
use App\Models\UserTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminFinancialsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_voucher_financials_grouped_by_currency(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$owner, $winner, $date] = $this->createSpecDate();
        $gbpProvider = $this->createProvider('Dinner House', 'GBP');
        $usdProvider = $this->createProvider('Sky Bar', 'USD');

        $this->createVoucher($date, $gbpProvider, $owner, $winner, [
            'currency' => 'GBP',
            'status' => DateVoucher::STATUS_REDEEMED,
            'total_spent' => 120,
            'redeemed_at' => '2026-05-12 12:00:00',
            'created_at' => '2026-05-12 10:00:00',
        ]);
        $this->createVoucher($date, $gbpProvider, $owner, $winner, [
            'currency' => 'GBP',
            'status' => DateVoucher::STATUS_REDEEMED,
            'total_spent' => 80,
            'redeemed_at' => '2026-05-13 12:00:00',
            'created_at' => '2026-05-13 10:00:00',
        ]);
        $this->createVoucher($date, $usdProvider, $owner, $winner, [
            'currency' => 'USD',
            'status' => DateVoucher::STATUS_REDEEMED,
            'total_spent' => 300,
            'redeemed_at' => '2026-05-13 13:00:00',
            'created_at' => '2026-05-13 11:00:00',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/financials/vouchers?period=month&month=2026-05&date_field=redeemed_at')
            ->assertOk()
            ->assertJsonPath('data.summary.total_vouchers', 3)
            ->assertJsonPath('data.summary.redeemed', 3)
            ->assertJsonPath('data.vouchers.total', 3)
            ->json('data.summary.spend_by_currency');

        $totals = collect($response)->keyBy('currency');
        $this->assertEquals(200.0, $totals['GBP']['total_spent']);
        $this->assertEquals(100.0, $totals['GBP']['average_spent']);
        $this->assertEquals(300.0, $totals['USD']['total_spent']);
    }

    public function test_voucher_financials_can_filter_by_provider_and_day(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$owner, $winner, $date] = $this->createSpecDate();
        $provider = $this->createProvider('Dinner House', 'GBP');
        $otherProvider = $this->createProvider('Other Place', 'GBP');

        $this->createVoucher($date, $provider, $owner, $winner, [
            'currency' => 'GBP',
            'status' => DateVoucher::STATUS_REDEEMED,
            'total_spent' => 150,
            'redeemed_at' => '2026-05-14 12:00:00',
            'created_at' => '2026-05-14 10:00:00',
        ]);
        $this->createVoucher($date, $provider, $owner, $winner, [
            'currency' => 'GBP',
            'status' => DateVoucher::STATUS_REDEEMED,
            'total_spent' => 90,
            'redeemed_at' => '2026-05-13 12:00:00',
            'created_at' => '2026-05-13 10:00:00',
        ]);
        $this->createVoucher($date, $otherProvider, $owner, $winner, [
            'currency' => 'GBP',
            'status' => DateVoucher::STATUS_REDEEMED,
            'total_spent' => 400,
            'redeemed_at' => '2026-05-14 12:00:00',
            'created_at' => '2026-05-14 10:00:00',
        ]);

        Sanctum::actingAs($admin);

        $data = $this->getJson("/api/admin/financials/vouchers?provider_id={$provider->id}&period=day&date=2026-05-14&date_field=redeemed_at")
            ->assertOk()
            ->assertJsonPath('data.summary.total_vouchers', 1)
            ->assertJsonPath('data.vouchers.data.0.provider.id', $provider->id)
            ->json('data.summary.spend_by_currency');

        $this->assertEquals(150.0, $data[0]['total_spent']);
    }

    public function test_admin_can_view_credit_financials_with_net_movement_and_purchase_totals(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->createTransaction($user, [
            'type' => 'CREDIT',
            'item_type' => 'specdate_credits_5',
            'quantity' => 5,
            'amount' => 9.99,
            'currency' => 'GBP',
            'purpose' => 'Purchased credits',
            'created_at' => '2026-05-14 09:00:00',
        ]);
        $this->createTransaction($user, [
            'type' => 'DEBIT',
            'item_type' => 'credit',
            'quantity' => 1,
            'amount' => null,
            'currency' => null,
            'purpose' => 'Created Spec',
            'created_at' => '2026-05-14 10:00:00',
        ]);
        $this->createTransaction($other, [
            'type' => 'CREDIT',
            'item_type' => 'specdate_credits_10',
            'quantity' => 10,
            'amount' => 17.99,
            'currency' => 'USD',
            'purpose' => 'Purchased credits',
            'created_at' => '2026-05-14 11:00:00',
        ]);

        Sanctum::actingAs($admin);

        $data = $this->getJson('/api/admin/financials/credits?period=day&date=2026-05-14')
            ->assertOk()
            ->assertJsonPath('data.summary.total_transactions', 3)
            ->assertJsonPath('data.summary.credits_purchased_or_granted', 15)
            ->assertJsonPath('data.summary.credits_spent', 1)
            ->assertJsonPath('data.summary.net_credit_movement', 14)
            ->assertJsonPath('data.transactions.total', 3)
            ->json('data.summary.purchase_amount_by_currency');

        $totals = collect($data)->keyBy('currency');
        $this->assertEquals(9.99, $totals['GBP']['total_amount']);
        $this->assertEquals(17.99, $totals['USD']['total_amount']);
    }

    public function test_credit_financials_can_filter_by_user_and_type(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->createTransaction($user, [
            'type' => 'DEBIT',
            'item_type' => 'credit',
            'quantity' => 1,
            'purpose' => 'Created Spec',
            'created_at' => '2026-05-14 10:00:00',
        ]);
        $this->createTransaction($user, [
            'type' => 'CREDIT',
            'item_type' => 'specdate_credits_5',
            'quantity' => 5,
            'amount' => 9.99,
            'currency' => 'GBP',
            'purpose' => 'Purchased credits',
            'created_at' => '2026-05-14 10:00:00',
        ]);
        $this->createTransaction($other, [
            'type' => 'DEBIT',
            'item_type' => 'credit',
            'quantity' => 1,
            'purpose' => 'Created Spec',
            'created_at' => '2026-05-14 10:00:00',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/admin/financials/credits?user_id={$user->id}&type=DEBIT")
            ->assertOk()
            ->assertJsonPath('data.summary.total_transactions', 1)
            ->assertJsonPath('data.summary.credits_spent', 1)
            ->assertJsonPath('data.transactions.data.0.user.id', $user->id)
            ->assertJsonPath('data.transactions.data.0.type', 'DEBIT');
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
            'date_code' => strtoupper(fake()->bothify('??###')),
        ]);

        return [$owner, $winner, $date];
    }

    private function createProvider(string $name, string $currency): ProviderProfile
    {
        $provider = User::factory()->create(['role' => 'provider']);

        return ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => $name,
            'city' => 'London',
            'country' => 'United Kingdom',
            'currency' => $currency,
            'discount_percentage' => 20,
            'booking_required' => true,
        ]);
    }

    private function createVoucher(SpecDate $date, ProviderProfile $provider, User $owner, User $winner, array $attributes): DateVoucher
    {
        $voucher = DateVoucher::create([
            'spec_date_id' => $date->id,
            'provider_profile_id' => $provider->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
            'requested_by_user_id' => $owner->id,
            'voucher_code' => strtoupper(fake()->bothify('DU-####??')),
            'qr_token' => fake()->uuid(),
            'discount_percentage' => 20,
            'minimum_spend' => 50,
            'currency' => $attributes['currency'] ?? $provider->currency,
            'booking_required' => true,
            'status' => $attributes['status'] ?? DateVoucher::STATUS_ACTIVE,
            'redeemed_at' => $attributes['redeemed_at'] ?? null,
            'redeemed_by_provider_user_id' => $provider->user_id,
            'total_spent' => $attributes['total_spent'] ?? null,
            'spend_recorded_at' => $attributes['redeemed_at'] ?? null,
            'expires_at' => now()->addDays(30),
        ]);

        if (isset($attributes['created_at'])) {
            $voucher->forceFill([
                'created_at' => $attributes['created_at'],
                'updated_at' => $attributes['created_at'],
            ])->save();
        }

        return $voucher->fresh();
    }

    private function createTransaction(User $user, array $attributes): UserTransaction
    {
        $transaction = UserTransaction::create([
            'user_id' => $user->id,
            'type' => $attributes['type'],
            'item_type' => $attributes['item_type'],
            'quantity' => $attributes['quantity'],
            'amount' => $attributes['amount'] ?? null,
            'currency' => $attributes['currency'] ?? null,
            'purpose' => $attributes['purpose'],
            'metadata' => $attributes['metadata'] ?? null,
        ]);

        if (isset($attributes['created_at'])) {
            $transaction->forceFill([
                'created_at' => $attributes['created_at'],
                'updated_at' => $attributes['created_at'],
            ])->save();
        }

        return $transaction->fresh();
    }
}
