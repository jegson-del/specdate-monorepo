<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('spec_notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('spec_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('reminder_key');
            $table->json('channels')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->unique(['spec_id', 'user_id', 'type', 'reminder_key'], 'spec_notification_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('spec_notification_logs');
    }
};
