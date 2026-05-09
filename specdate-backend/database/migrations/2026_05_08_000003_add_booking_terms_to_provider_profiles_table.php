<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->decimal('minimum_spend', 10, 2)->nullable()->after('discount_percentage');
            $table->boolean('booking_required')->default(false)->after('minimum_spend');
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropColumn(['minimum_spend', 'booking_required']);
        });
    }
};
