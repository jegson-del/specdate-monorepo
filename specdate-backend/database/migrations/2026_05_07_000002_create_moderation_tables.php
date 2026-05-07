<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blocked_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blocker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('blocked_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->unique(['blocker_id', 'blocked_id']);
            $table->index(['blocked_id', 'blocker_id']);
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reported_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('target_type');
            $table->unsignedBigInteger('target_id');
            $table->string('reason');
            $table->text('details')->nullable();
            $table->string('status')->default('open');
            $table->string('action')->nullable();
            $table->text('action_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['target_type', 'target_id']);
            $table->index(['status', 'created_at']);
        });

        Schema::table('chat_messages', function (Blueprint $table) {
            $table->timestamp('hidden_at')->nullable()->after('read_at');
            $table->string('hidden_reason')->nullable()->after('hidden_at');
        });

        Schema::table('media', function (Blueprint $table) {
            $table->timestamp('hidden_at')->nullable()->after('size');
            $table->string('hidden_reason')->nullable()->after('hidden_at');
        });

        Schema::table('spec_round_answers', function (Blueprint $table) {
            $table->timestamp('hidden_at')->nullable()->after('media_id');
            $table->string('hidden_reason')->nullable()->after('hidden_at');
        });
    }

    public function down(): void
    {
        Schema::table('spec_round_answers', function (Blueprint $table) {
            $table->dropColumn(['hidden_at', 'hidden_reason']);
        });
        Schema::table('media', function (Blueprint $table) {
            $table->dropColumn(['hidden_at', 'hidden_reason']);
        });
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropColumn(['hidden_at', 'hidden_reason']);
        });
        Schema::dropIfExists('reports');
        Schema::dropIfExists('blocked_users');
    }
};
