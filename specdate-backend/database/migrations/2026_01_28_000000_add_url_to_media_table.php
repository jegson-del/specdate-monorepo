<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Store the full S3 public URL so mobile can show images without computing it.
     */
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->string('url', 2048)->nullable()->after('file_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropColumn('url');
        });
    }
};
