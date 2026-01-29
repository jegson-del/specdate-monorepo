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
        Schema::create('spec_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spec_id')->constrained()->cascadeOnDelete();
            $table->integer('round_number');
            $table->text('question_text');
            $table->enum('status', ['PENDING', 'ACTIVE', 'COMPLETED'])->default('PENDING');
            $table->integer('elimination_count')->default(0); // Target number to eliminate
            $table->timestamps();
        });

        Schema::create('spec_round_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spec_round_id')->constrained('spec_rounds')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('answer_text');
            $table->boolean('is_eliminated')->default(false); // If true, this answer caused elimination
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spec_round_answers');
        Schema::dropIfExists('spec_rounds');
    }
};
