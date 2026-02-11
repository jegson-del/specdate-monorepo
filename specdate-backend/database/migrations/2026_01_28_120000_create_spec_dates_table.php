<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spec_dates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spec_id')->constrained('specs')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete(); // spec owner
            $table->foreignId('winner_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('date_code', 6)->unique(); // 6-char alphanumeric
            $table->timestamps();

            $table->index(['spec_id', 'owner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spec_dates');
    }
};
