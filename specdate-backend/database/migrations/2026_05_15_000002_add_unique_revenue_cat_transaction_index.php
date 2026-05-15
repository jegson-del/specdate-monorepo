<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_transactions', function (Blueprint $table) {
            $table->unique('revenue_cat_transaction_id', 'user_transactions_revenue_cat_tx_unique');
        });
    }

    public function down(): void
    {
        Schema::table('user_transactions', function (Blueprint $table) {
            $table->dropUnique('user_transactions_revenue_cat_tx_unique');
        });
    }
};
