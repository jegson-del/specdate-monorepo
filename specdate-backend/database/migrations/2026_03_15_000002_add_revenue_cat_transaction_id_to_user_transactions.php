<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * RevenueCat transaction id and currency (from RevenueCat) for proper tracking on CREDIT rows.
     */
    public function up(): void
    {
        Schema::table('user_transactions', function (Blueprint $table) {
            $table->string('revenue_cat_transaction_id', 255)->nullable()->after('purpose');
            // currency already exists; ensure we use it for RevenueCat purchase amount/currency
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_transactions', function (Blueprint $table) {
            $table->dropColumn('revenue_cat_transaction_id');
        });
    }
};
