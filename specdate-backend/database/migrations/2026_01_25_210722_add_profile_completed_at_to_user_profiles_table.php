<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('user_profiles', 'height')) {
                $table->integer('height')->nullable()->after('sex'); // cm
            }
            if (!Schema::hasColumn('user_profiles', 'ethnicity')) {
                $table->string('ethnicity')->nullable()->after('height');
            }
            if (!Schema::hasColumn('user_profiles', 'profile_completed_at')) {
                $table->timestamp('profile_completed_at')->nullable()->after('updated_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('user_profiles', 'profile_completed_at')) {
                $table->dropColumn('profile_completed_at');
            }
            if (Schema::hasColumn('user_profiles', 'ethnicity')) {
                $table->dropColumn('ethnicity');
            }
            if (Schema::hasColumn('user_profiles', 'height')) {
                $table->dropColumn('height');
            }
        });
    }
};
