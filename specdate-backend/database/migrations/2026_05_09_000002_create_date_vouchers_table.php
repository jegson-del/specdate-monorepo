<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('date_vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spec_date_id')->constrained('spec_dates')->cascadeOnDelete();
            $table->foreignId('provider_profile_id')->constrained('provider_profiles')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('winner_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('requested_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('voucher_code', 16)->unique();
            $table->string('qr_token', 64)->unique();
            $table->unsignedTinyInteger('discount_percentage');
            $table->decimal('minimum_spend', 10, 2)->nullable();
            $table->boolean('booking_required')->default(false);
            $table->string('status')->default('active');
            $table->timestamp('provider_decision_at')->nullable();
            $table->foreignId('provider_decision_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('redeemed_at')->nullable();
            $table->foreignId('redeemed_by_provider_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['spec_date_id', 'provider_profile_id', 'status'], 'date_vouchers_match_provider_status_index');
            $table->index(['provider_profile_id', 'status']);
            $table->index(['owner_id', 'winner_user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('date_vouchers');
    }
};
