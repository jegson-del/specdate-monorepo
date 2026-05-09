<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_threads', function (Blueprint $table) {
            if (!Schema::hasColumn('chat_threads', 'type')) {
                $table->string('type')->default('match')->after('id');
            }
            if (!Schema::hasColumn('chat_threads', 'customer_id')) {
                $table->foreignId('customer_id')->nullable()->after('winner_user_id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('chat_threads', 'provider_id')) {
                $table->foreignId('provider_id')->nullable()->after('customer_id')->constrained('users')->nullOnDelete();
            }
        });

        if (Schema::hasColumn('chat_threads', 'type')) {
            DB::table('chat_threads')->whereNull('type')->update(['type' => 'match']);
        }

        $driver = Schema::getConnection()->getDriverName();
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE chat_threads MODIFY spec_date_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE chat_threads MODIFY spec_id BIGINT UNSIGNED NULL');
        } elseif ($driver === 'pgsql') {
            DB::statement('ALTER TABLE chat_threads ALTER COLUMN spec_date_id DROP NOT NULL');
            DB::statement('ALTER TABLE chat_threads ALTER COLUMN spec_id DROP NOT NULL');
        }

        try {
            Schema::table('chat_threads', function (Blueprint $table) {
                $table->unique(['type', 'customer_id', 'provider_id'], 'chat_threads_type_customer_provider_unique');
            });
        } catch (Throwable) {
            // Fresh databases already have this index from the base chat migration.
        }
    }

    public function down(): void
    {
        Schema::table('chat_threads', function (Blueprint $table) {
            try {
                $table->dropUnique('chat_threads_type_customer_provider_unique');
            } catch (Throwable) {
            }

            if (Schema::hasColumn('chat_threads', 'provider_id')) {
                $table->dropConstrainedForeignId('provider_id');
            }
            if (Schema::hasColumn('chat_threads', 'customer_id')) {
                $table->dropConstrainedForeignId('customer_id');
            }
            if (Schema::hasColumn('chat_threads', 'type')) {
                $table->dropColumn('type');
            }
        });
    }
};
