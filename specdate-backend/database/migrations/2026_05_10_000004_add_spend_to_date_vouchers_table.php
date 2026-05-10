<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('date_vouchers', function (Blueprint $table) {
            if (!Schema::hasColumn('date_vouchers', 'total_spent')) {
                $table->decimal('total_spent', 10, 2)->nullable()->after('redeemed_by_provider_user_id');
            }
            if (!Schema::hasColumn('date_vouchers', 'spend_recorded_at')) {
                $table->timestamp('spend_recorded_at')->nullable()->after('total_spent');
            }
        });
    }

    public function down(): void
    {
        Schema::table('date_vouchers', function (Blueprint $table) {
            if (Schema::hasColumn('date_vouchers', 'spend_recorded_at')) {
                $table->dropColumn('spend_recorded_at');
            }
            if (Schema::hasColumn('date_vouchers', 'total_spent')) {
                $table->dropColumn('total_spent');
            }
        });
    }
};
