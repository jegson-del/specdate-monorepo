<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->index(['is_verified', 'country', 'created_at'], 'provider_profiles_verified_country_created_index');
        });

        Schema::table('chat_threads', function (Blueprint $table) {
            $table->index(['type', 'spec_id', 'owner_id', 'winner_user_id'], 'chat_threads_match_lookup_index');
        });
    }

    public function down(): void
    {
        Schema::table('chat_threads', function (Blueprint $table) {
            $table->dropIndex('chat_threads_match_lookup_index');
        });

        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropIndex('provider_profiles_verified_country_created_index');
        });
    }
};
