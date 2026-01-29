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
            $table->string('item_type'); // e.g. 'blue_balloon', 'red_balloon'
            $table->integer('quantity'); // Amount of items
            $table->decimal('amount', 10, 2)->nullable(); // Money value (cost/price)
            $table->string('currency', 3)->nullable()->default('GBP');
            $table->string('purpose'); // Description e.g. 'Bought 5 Balloons', 'Joined Spec'
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
