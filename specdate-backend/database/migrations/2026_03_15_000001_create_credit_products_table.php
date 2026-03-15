<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Stores RevenueCat product_id and quantity (credits). App/RevenueCat send product_id; backend applies quantity.
     */
    public function up(): void
    {
        Schema::create('credit_products', function (Blueprint $table) {
            $table->id();
            $table->string('product_id', 64)->unique(); // Same id as in RevenueCat (e.g. specdate_credits_5)
            $table->unsignedInteger('quantity');          // Credits granted when purchased
            $table->string('name', 128)->nullable();     // Display name (e.g. "5 Credits")
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credit_products');
    }
};
