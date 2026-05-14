<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_accesses', function (Blueprint $table) {
            $table->boolean('can_manage_admin_users')->default(false)->after('can_view_financial_credits');
        });

        DB::table('admin_accesses')->update([
            'can_manage_admin_users' => true,
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('admin_accesses', function (Blueprint $table) {
            $table->dropColumn('can_manage_admin_users');
        });
    }
};
