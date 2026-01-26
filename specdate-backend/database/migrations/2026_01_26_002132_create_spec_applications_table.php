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
        Schema::create('spec_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spec_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('user_role', ['owner', 'participant'])->default('participant');
            $table->enum('status', ['PENDING', 'ACCEPTED', 'REJECTED', 'ELIMINATED', 'WINNER'])->default('PENDING');
            $table->timestamps();

            // Prevent duplicate applications
            $table->unique(['spec_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spec_applications');
    }
};
