<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_profile_id')->constrained('provider_profiles')->cascadeOnDelete();
            $table->foreignId('date_voucher_id')->constrained('date_vouchers')->cascadeOnDelete();
            $table->foreignId('reviewer_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(['date_voucher_id', 'reviewer_id']);
            $table->index(['provider_profile_id', 'created_at']);
        });

        Schema::create('date_partner_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spec_date_id')->constrained('spec_dates')->cascadeOnDelete();
            $table->foreignId('date_voucher_id')->constrained('date_vouchers')->cascadeOnDelete();
            $table->foreignId('reviewer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reviewed_user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->unsignedTinyInteger('chemistry_rating')->nullable();
            $table->unsignedTinyInteger('safety_rating')->nullable();
            $table->boolean('would_meet_again')->nullable();
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(['date_voucher_id', 'reviewer_id', 'reviewed_user_id'], 'date_partner_review_unique');
            $table->index(['reviewed_user_id', 'created_at']);
        });

        Schema::create('review_prompt_dismissals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('date_voucher_id')->constrained('date_vouchers')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('dismissed_at');
            $table->timestamps();

            $table->unique(['date_voucher_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_prompt_dismissals');
        Schema::dropIfExists('date_partner_reviews');
        Schema::dropIfExists('provider_reviews');
    }
};
