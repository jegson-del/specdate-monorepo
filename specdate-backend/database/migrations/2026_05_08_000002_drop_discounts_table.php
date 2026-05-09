<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('discounts');
    }

    public function down(): void
    {
        // Discount offers are intentionally not restored. ProviderProfile.discount_percentage
        // is the source of truth until date vouchers get their own redemption table.
    }
};
