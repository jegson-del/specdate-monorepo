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
            if (! Schema::hasColumn('admin_accesses', 'can_manage_success_stories')) {
                $table->boolean('can_manage_success_stories')->default(false)->after('can_manage_contact_messages');
            }
        });

        DB::table('admin_accesses')->update([
            'can_manage_success_stories' => true,
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('admin_accesses', function (Blueprint $table) {
            if (Schema::hasColumn('admin_accesses', 'can_manage_success_stories')) {
                $table->dropColumn('can_manage_success_stories');
            }
        });
    }
};
