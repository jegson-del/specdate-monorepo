<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_invites', function (Blueprint $table) {
            $table->id();
            $table->string('provider_name');
            $table->string('email');
            $table->string('service_type')->nullable();
            $table->text('personal_message')->nullable();
            $table->string('token_hash', 64)->unique();
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('created_provider_profile_id')->nullable()->constrained('provider_profiles')->nullOnDelete();
            $table->timestamps();

            $table->index(['email', 'revoked_at', 'accepted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_invites');
    }
};
