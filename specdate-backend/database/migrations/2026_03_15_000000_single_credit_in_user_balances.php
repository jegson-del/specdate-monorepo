<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Replace red_sparks + blue_sparks with a single credits column.
     */
    public function up(): void
    {
        Schema::table('user_balances', function (Blueprint $table) {
            $table->unsignedInteger('credits')->default(0)->after('user_id');
        });

        // Backfill: credits = red_sparks + blue_sparks (existing users keep their total)
        DB::table('user_balances')->update([
            'credits' => DB::raw('COALESCE(red_sparks, 0) + COALESCE(blue_sparks, 0)'),
        ]);

        Schema::table('user_balances', function (Blueprint $table) {
            $table->dropColumn(['red_sparks', 'blue_sparks']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_balances', function (Blueprint $table) {
            $table->unsignedInteger('red_sparks')->default(0)->after('user_id');
            $table->unsignedInteger('blue_sparks')->default(0)->after('red_sparks');
        });

        // Approximate reverse: split credits in half (or all to blue_sparks)
        DB::table('user_balances')->update([
            'red_sparks' => DB::raw('credits DIV 2'),
            'blue_sparks' => DB::raw('credits - (credits DIV 2)'),
        ]);

        Schema::table('user_balances', function (Blueprint $table) {
            $table->dropColumn('credits');
        });
    }
};
