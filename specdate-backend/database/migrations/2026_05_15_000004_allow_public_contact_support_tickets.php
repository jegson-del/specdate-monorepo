<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('support_tickets', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
            $table->string('contact_name', 160)->nullable()->after('user_id');
            $table->string('contact_email', 254)->nullable()->after('contact_name');
            $table->string('contact_ip_address', 45)->nullable()->after('contact_email');
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['contact_name', 'contact_email', 'contact_ip_address']);
            $table->foreignId('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
