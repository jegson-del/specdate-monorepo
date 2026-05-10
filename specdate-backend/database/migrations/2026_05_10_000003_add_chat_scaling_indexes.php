<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->index(['chat_thread_id', 'id'], 'chat_messages_thread_id_id_index');
            $table->index(['chat_thread_id', 'hidden_at', 'id'], 'chat_messages_thread_hidden_id_index');
            $table->index(['sender_id', 'read_at'], 'chat_messages_sender_read_index');
            $table->index(['created_at', 'media_id'], 'chat_messages_created_media_index');
        });

        Schema::table('chat_threads', function (Blueprint $table) {
            $table->index(['last_message_at', 'created_at'], 'chat_threads_last_created_index');
        });
    }

    public function down(): void
    {
        Schema::table('chat_threads', function (Blueprint $table) {
            $table->dropIndex('chat_threads_last_created_index');
        });

        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropIndex('chat_messages_thread_id_id_index');
            $table->dropIndex('chat_messages_thread_hidden_id_index');
            $table->dropIndex('chat_messages_sender_read_index');
            $table->dropIndex('chat_messages_created_media_index');
        });
    }
};
