<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('success_stories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title', 140);
            $table->text('body');
            $table->string('attribution', 120)->nullable();
            $table->string('location', 160)->nullable();
            $table->string('story_type', 40)->default('date');
            $table->string('image_url')->nullable();
            $table->unsignedTinyInteger('rating')->nullable();
            $table->string('status', 24)->default('draft');
            $table->boolean('is_featured')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'is_featured', 'published_at']);
            $table->index(['status', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('success_stories');
    }
};
