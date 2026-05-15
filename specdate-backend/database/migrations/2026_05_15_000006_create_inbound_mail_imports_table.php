<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inbound_mail_imports', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 40)->default('imap');
            $table->string('mailbox', 120)->default('INBOX');
            $table->string('uid', 190)->nullable();
            $table->string('message_id')->nullable();
            $table->foreignId('support_ticket_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 30);
            $table->string('failure_reason')->nullable();
            $table->timestamp('raw_received_at')->nullable();
            $table->timestamp('imported_at')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'mailbox', 'uid'], 'inbound_mail_imports_provider_mailbox_uid_unique');
            $table->index(['provider', 'mailbox', 'message_id'], 'inbound_mail_imports_provider_mailbox_message_index');
            $table->index(['support_ticket_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inbound_mail_imports');
    }
};
