<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('credit_products')->updateOrInsert(
            ['product_id' => 'specdate_credits_1'],
            [
                'quantity' => 1,
                'name' => '1 Credit',
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('credit_products')
            ->where('product_id', 'specdate_credits_3')
            ->update(['sort_order' => 2, 'updated_at' => now()]);

        DB::table('credit_products')
            ->where('product_id', 'specdate_credits_5')
            ->update(['sort_order' => 3, 'updated_at' => now()]);

        DB::table('credit_products')
            ->where('product_id', 'specdate_credits_10')
            ->update(['sort_order' => 4, 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('credit_products')
            ->where('product_id', 'specdate_credits_1')
            ->delete();

        DB::table('credit_products')
            ->where('product_id', 'specdate_credits_3')
            ->update(['sort_order' => 1, 'updated_at' => now()]);

        DB::table('credit_products')
            ->where('product_id', 'specdate_credits_5')
            ->update(['sort_order' => 2, 'updated_at' => now()]);

        DB::table('credit_products')
            ->where('product_id', 'specdate_credits_10')
            ->update(['sort_order' => 3, 'updated_at' => now()]);
    }
};
