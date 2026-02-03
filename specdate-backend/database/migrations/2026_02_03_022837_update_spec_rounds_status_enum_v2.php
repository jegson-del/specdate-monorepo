<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add 'REVIEWING' to the enum
        DB::statement("ALTER TABLE spec_rounds MODIFY COLUMN status ENUM('PENDING', 'ACTIVE', 'REVIEWING', 'COMPLETED') NOT NULL DEFAULT 'PENDING'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original enum
        DB::statement("ALTER TABLE spec_rounds MODIFY COLUMN status ENUM('PENDING', 'ACTIVE', 'COMPLETED') NOT NULL DEFAULT 'PENDING'");
    }
};
