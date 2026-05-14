<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('phone_blacklist_entries', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 32);
            $table->string('normalized_phone', 32)->unique();
            $table->string('reason', 255)->nullable();
            $table->string('source', 64)->default('admin');
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['normalized_phone', 'expires_at']);
            $table->index(['source', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('phone_blacklist_entries');
    }
};
