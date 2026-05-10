<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('spec_dates', function (Blueprint $table) {
            if (!Schema::hasColumn('spec_dates', 'root_spec_date_id')) {
                $table->foreignId('root_spec_date_id')->nullable()->after('id')->constrained('spec_dates')->nullOnDelete();
            }
            if (!Schema::hasColumn('spec_dates', 'parent_spec_date_id')) {
                $table->foreignId('parent_spec_date_id')->nullable()->after('root_spec_date_id')->constrained('spec_dates')->nullOnDelete();
            }
            if (!Schema::hasColumn('spec_dates', 'scheduled_by_user_id')) {
                $table->foreignId('scheduled_by_user_id')->nullable()->after('winner_user_id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('spec_dates', 'date_number')) {
                $table->unsignedInteger('date_number')->default(1)->after('date_code');
            }
            if (!Schema::hasColumn('spec_dates', 'status')) {
                $table->string('status', 24)->default('active')->after('date_number');
            }
        });

        DB::table('spec_dates')->whereNull('date_number')->update(['date_number' => 1]);
        DB::table('spec_dates')->whereNull('status')->update(['status' => 'active']);
        DB::table('spec_dates')
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('date_vouchers')
                    ->whereColumn('date_vouchers.spec_date_id', 'spec_dates.id')
                    ->where('date_vouchers.status', 'cancelled');
            })
            ->update(['status' => 'cancelled']);
        DB::table('spec_dates')
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('date_vouchers')
                    ->whereColumn('date_vouchers.spec_date_id', 'spec_dates.id')
                    ->whereIn('date_vouchers.status', ['redeemed', 'completed']);
            })
            ->update(['status' => 'completed']);

        Schema::table('spec_dates', function (Blueprint $table) {
            $table->index(['root_spec_date_id', 'date_number'], 'spec_dates_root_number_index');
            $table->index(['owner_id', 'winner_user_id', 'status'], 'spec_dates_users_status_index');
        });
    }

    public function down(): void
    {
        Schema::table('spec_dates', function (Blueprint $table) {
            $table->dropIndex('spec_dates_root_number_index');
            $table->dropIndex('spec_dates_users_status_index');
            $table->dropConstrainedForeignId('root_spec_date_id');
            $table->dropConstrainedForeignId('parent_spec_date_id');
            $table->dropConstrainedForeignId('scheduled_by_user_id');
            $table->dropColumn(['date_number', 'status']);
        });
    }
};
