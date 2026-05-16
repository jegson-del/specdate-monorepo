<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('specs', function (Blueprint $table) {
            if (!Schema::hasColumn('specs', 'expiry_extension_count')) {
                $table->unsignedTinyInteger('expiry_extension_count')->default(0)->after('expires_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('specs', function (Blueprint $table) {
            if (Schema::hasColumn('specs', 'expiry_extension_count')) {
                $table->dropColumn('expiry_extension_count');
            }
        });
    }
};
