<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_message_archives', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_thread_id')->constrained('chat_threads')->cascadeOnDelete();
            $table->unsignedBigInteger('from_message_id');
            $table->unsignedBigInteger('to_message_id');
            $table->timestamp('from_sent_at');
            $table->timestamp('to_sent_at');
            $table->unsignedInteger('message_count');
            $table->string('disk')->default('s3');
            $table->string('path');
            $table->string('checksum', 64);
            $table->string('status')->default('stored');
            $table->timestamp('stored_at')->nullable();
            $table->timestamps();

            $table->index(['chat_thread_id', 'from_message_id', 'to_message_id'], 'chat_archives_thread_message_range_index');
            $table->index(['chat_thread_id', 'from_sent_at'], 'chat_archives_thread_sent_at_index');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_message_archives');
    }
};
