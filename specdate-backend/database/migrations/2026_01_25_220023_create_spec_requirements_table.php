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
        Schema::create('spec_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spec_id')->constrained()->cascadeOnDelete();
            $table->string('field'); // e.g. age, height, genotype
            $table->string('operator'); // e.g. >=, <=, =, in
            $table->text('value'); // JSON encoded string if array, or raw string
            $table->boolean('is_compulsory')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spec_requirements');
    }
};
