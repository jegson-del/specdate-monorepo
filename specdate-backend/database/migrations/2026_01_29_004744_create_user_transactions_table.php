<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('user_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['CREDIT', 'DEBIT']); // CREDIT = Bought/Earned, DEBIT = Spent
            $table->string('item_type'); // CREDIT (purchase): RevenueCat product_id (e.g. specdate_credits_5); DEBIT (spend): 'credit'
            $table->integer('quantity'); // Amount of items
            $table->decimal('amount', 10, 2)->nullable(); // Money value (cost/price)
            $table->string('currency', 3)->nullable()->default('GBP');
            $table->string('purpose'); // e.g. 'Created Spec', 'Purchased (RevenueCat)'
            $table->json('metadata')->nullable(); // Store { spec_id: 1 } etc.
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_transactions');
    }
};
