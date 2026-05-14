<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_accesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->boolean('can_view_financial_vouchers')->default(false);
            $table->boolean('can_view_financial_credits')->default(false);
            $table->timestamps();
        });

        DB::table('users')
            ->where('role', 'admin')
            ->orderBy('id')
            ->select('id')
            ->get()
            ->each(function ($admin) {
                DB::table('admin_accesses')->insert([
                    'admin_id' => $admin->id,
                    'can_view_financial_vouchers' => true,
                    'can_view_financial_credits' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_accesses');
    }
};
