<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserBalance;
use App\Models\UserTransaction;
use Database\Seeders\CreditProductSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CreditsPurchaseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(CreditProductSeeder::class);
    }

    public function test_credit_products_include_one_credit_pack_in_order(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/credits/products')
            ->assertOk()
            ->assertJsonPath('data.0.product_id', 'specdate_credits_1')
            ->assertJsonPath('data.0.quantity', 1)
            ->assertJsonPath('data.1.product_id', 'specdate_credits_3')
            ->assertJsonPath('data.2.product_id', 'specdate_credits_5')
            ->assertJsonPath('data.3.product_id', 'specdate_credits_10');
    }

    public function test_grant_credits_uses_backend_product_quantity_and_stores_revenuecat_metadata(): void
    {
        $user = User::factory()->create();
        UserBalance::create(['user_id' => $user->id, 'credits' => 2]);
        Sanctum::actingAs($user);

        $this->postJson('/api/credits/grant', [
            'product_id' => 'specdate_credits_3',
            'revenue_cat_transaction_id' => 'rc_tx_metadata_1',
            'platform' => 'android',
            'store' => 'test_store',
            'store_transaction_id' => 'store_tx_123',
            'revenue_cat_app_user_id' => (string) $user->id,
            'environment' => 'development',
            'is_sandbox' => true,
            'currency' => 'USD',
            'amount' => 7.99,
        ])
            ->assertOk()
            ->assertJsonPath('credits', 5);

        $this->assertDatabaseHas('user_balances', [
            'user_id' => $user->id,
            'credits' => 5,
        ]);

        $transaction = UserTransaction::query()->where('revenue_cat_transaction_id', 'rc_tx_metadata_1')->firstOrFail();
        $this->assertSame('specdate_credits_3', $transaction->item_type);
        $this->assertSame(3, $transaction->quantity);
        $this->assertSame('android', $transaction->metadata['platform']);
        $this->assertSame('test_store', $transaction->metadata['store']);
        $this->assertSame('store_tx_123', $transaction->metadata['store_transaction_id']);
        $this->assertSame((string) $user->id, $transaction->metadata['revenue_cat_app_user_id']);
        $this->assertSame('development', $transaction->metadata['environment']);
        $this->assertTrue($transaction->metadata['is_sandbox']);
    }

    public function test_invalid_product_id_is_rejected_without_changing_balance(): void
    {
        $user = User::factory()->create();
        UserBalance::create(['user_id' => $user->id, 'credits' => 2]);
        Sanctum::actingAs($user);

        $this->postJson('/api/credits/grant', [
            'product_id' => 'specdate_credits_999',
            'revenue_cat_transaction_id' => 'rc_tx_invalid_product',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Unknown or invalid product_id. product_id must exist in credit_products and match RevenueCat.');

        $this->assertDatabaseHas('user_balances', [
            'user_id' => $user->id,
            'credits' => 2,
        ]);
        $this->assertDatabaseMissing('user_transactions', [
            'revenue_cat_transaction_id' => 'rc_tx_invalid_product',
        ]);
    }

    public function test_duplicate_transaction_for_same_user_is_idempotent(): void
    {
        $user = User::factory()->create();
        UserBalance::create(['user_id' => $user->id, 'credits' => 0]);
        Sanctum::actingAs($user);

        $payload = [
            'product_id' => 'specdate_credits_1',
            'revenue_cat_transaction_id' => 'rc_tx_same_user',
        ];

        $this->postJson('/api/credits/grant', $payload)
            ->assertOk()
            ->assertJsonPath('credits', 1);

        $this->postJson('/api/credits/grant', $payload)
            ->assertOk()
            ->assertJsonPath('message', 'Credits already granted for this purchase.')
            ->assertJsonPath('credits', 1);

        $this->assertSame(1, UserTransaction::query()->where('revenue_cat_transaction_id', 'rc_tx_same_user')->count());
        $this->assertDatabaseHas('user_balances', [
            'user_id' => $user->id,
            'credits' => 1,
        ]);
    }

    public function test_duplicate_transaction_for_different_user_is_blocked(): void
    {
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();
        UserBalance::create(['user_id' => $firstUser->id, 'credits' => 0]);
        UserBalance::create(['user_id' => $secondUser->id, 'credits' => 0]);

        Sanctum::actingAs($firstUser);
        $this->postJson('/api/credits/grant', [
            'product_id' => 'specdate_credits_1',
            'revenue_cat_transaction_id' => 'rc_tx_cross_user',
        ])->assertOk();

        Sanctum::actingAs($secondUser);
        $this->postJson('/api/credits/grant', [
            'product_id' => 'specdate_credits_1',
            'revenue_cat_transaction_id' => 'rc_tx_cross_user',
        ])
            ->assertStatus(409)
            ->assertJsonPath('message', 'This purchase transaction has already been used by another account.');

        $this->assertSame(1, UserTransaction::query()->where('revenue_cat_transaction_id', 'rc_tx_cross_user')->count());
        $this->assertDatabaseHas('user_balances', [
            'user_id' => $secondUser->id,
            'credits' => 0,
        ]);
    }

    public function test_missing_balance_row_is_recovered_when_granting_credits(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/credits/grant', [
            'product_id' => 'specdate_credits_5',
            'revenue_cat_transaction_id' => 'rc_tx_missing_balance',
        ])
            ->assertOk()
            ->assertJsonPath('credits', 5);

        $this->assertDatabaseHas('user_balances', [
            'user_id' => $user->id,
            'credits' => 5,
        ]);
    }
}
