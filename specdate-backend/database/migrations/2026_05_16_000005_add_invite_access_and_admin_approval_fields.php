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
            if (!Schema::hasColumn('admin_accesses', 'can_manage_provider_invites')) {
                $table->boolean('can_manage_provider_invites')->default(false)->after('can_manage_admin_users');
            }
            if (!Schema::hasColumn('admin_accesses', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('admin_id');
            }
            if (!Schema::hasColumn('admin_accesses', 'approved_by')) {
                $table->foreignId('approved_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
            }
        });

        DB::table('admin_accesses')->update([
            'can_manage_provider_invites' => true,
            'approved_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('admin_accesses', function (Blueprint $table) {
            if (Schema::hasColumn('admin_accesses', 'approved_by')) {
                $table->dropConstrainedForeignId('approved_by');
            }
            if (Schema::hasColumn('admin_accesses', 'approved_at')) {
                $table->dropColumn('approved_at');
            }
            if (Schema::hasColumn('admin_accesses', 'can_manage_provider_invites')) {
                $table->dropColumn('can_manage_provider_invites');
            }
        });
    }
};
