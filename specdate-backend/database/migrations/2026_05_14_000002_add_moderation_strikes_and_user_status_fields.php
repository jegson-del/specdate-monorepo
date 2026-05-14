<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'moderation_status')) {
                $table->string('moderation_status', 32)->default('active');
            }
            if (! Schema::hasColumn('users', 'strike_count')) {
                $table->unsignedInteger('strike_count')->default(0);
            }
            if (! Schema::hasColumn('users', 'risk_score')) {
                $table->unsignedInteger('risk_score')->default(0);
            }
            if (! Schema::hasColumn('users', 'last_violation_at')) {
                $table->timestamp('last_violation_at')->nullable();
            }
            if (! Schema::hasColumn('users', 'suspended_until')) {
                $table->timestamp('suspended_until')->nullable();
            }
        });

        Schema::create('moderation_strikes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('case_id')->nullable()->constrained('moderation_cases')->nullOnDelete();
            $table->foreignId('report_id')->nullable()->constrained('reports')->nullOnDelete();
            $table->foreignId('issued_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('strike_number');
            $table->string('category', 64);
            $table->string('severity', 32);
            $table->text('reason');
            $table->json('evidence')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('revoked_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('revocation_reason')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'active']);
            $table->index(['case_id', 'active']);
            $table->index(['category', 'created_at']);
            $table->index(['expires_at', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moderation_strikes');

        Schema::table('users', function (Blueprint $table) {
            foreach (['suspended_until', 'last_violation_at', 'risk_score', 'strike_count', 'moderation_status'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
