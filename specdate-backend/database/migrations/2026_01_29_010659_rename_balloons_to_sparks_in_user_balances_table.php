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
        Schema::table('user_balances', function (Blueprint $table) {
            $table->renameColumn('red_balloons', 'red_sparks');
            $table->renameColumn('blue_balloons', 'blue_sparks');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_balances', function (Blueprint $table) {
            $table->renameColumn('red_sparks', 'red_balloons');
            $table->renameColumn('blue_sparks', 'blue_balloons');
        });
    }
};
