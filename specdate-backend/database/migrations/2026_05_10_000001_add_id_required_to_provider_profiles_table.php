<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('provider_profiles', 'id_required')) {
                $table->boolean('id_required')->default(false)->after('booking_required');
            }
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('provider_profiles', 'id_required')) {
                $table->dropColumn('id_required');
            }
        });
    }
};
