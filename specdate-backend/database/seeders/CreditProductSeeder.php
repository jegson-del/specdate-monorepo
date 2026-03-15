<?php

namespace Database\Seeders;

use App\Models\CreditProduct;
use Illuminate\Database\Seeder;

class CreditProductSeeder extends Seeder
{
    /**
     * Seed credit products. product_id must match RevenueCat (and App Store / Play Console).
     */
    public function run(): void
    {
        $products = [
            ['product_id' => 'specdate_credits_3',  'quantity' => 3,  'name' => '3 Credits',  'sort_order' => 1],
            ['product_id' => 'specdate_credits_5',  'quantity' => 5,  'name' => '5 Credits',  'sort_order' => 2],
            ['product_id' => 'specdate_credits_10', 'quantity' => 10, 'name' => '10 Credits', 'sort_order' => 3],
        ];

        foreach ($products as $p) {
            CreditProduct::updateOrCreate(
                ['product_id' => $p['product_id']],
                ['quantity' => $p['quantity'], 'name' => $p['name'], 'sort_order' => $p['sort_order']]
            );
        }

        $this->command->info('Credit products seeded.');
    }
}
