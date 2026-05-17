<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_activity_events', function (Blueprint $table) {
            $table->id();
            $table->string('type', 80)->index();
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('route')->nullable();
            $table->string('source_type')->nullable()->index();
            $table->unsignedBigInteger('source_id')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->json('counts')->nullable();
            $table->timestamps();

            $table->index(['source_type', 'source_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_activity_events');
    }
};
