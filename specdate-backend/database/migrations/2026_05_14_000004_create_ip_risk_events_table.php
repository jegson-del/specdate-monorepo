<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ip_risk_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip_address', 45);
            $table->string('event_type', 64);
            $table->string('severity', 32)->default('low');
            $table->unsignedInteger('score')->default(1);
            $table->string('method', 16)->nullable();
            $table->string('path', 255)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['ip_address', 'event_type', 'occurred_at']);
            $table->index(['user_id', 'event_type', 'occurred_at']);
            $table->index(['severity', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ip_risk_events');
    }
};
