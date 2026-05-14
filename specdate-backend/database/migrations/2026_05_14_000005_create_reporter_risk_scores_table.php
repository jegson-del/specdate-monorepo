<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reports', function (Blueprint $table) {
            if (! Schema::hasColumn('reports', 'reporter_ip_address')) {
                $table->string('reporter_ip_address', 45)->nullable()->after('reporter_id');
            }
            if (! Schema::hasColumn('reports', 'reporter_user_agent')) {
                $table->text('reporter_user_agent')->nullable()->after('reporter_ip_address');
            }
            if (! Schema::hasColumn('reports', 'reporter_score_outcome')) {
                $table->string('reporter_score_outcome', 64)->nullable()->after('reviewed_at');
            }
            if (! Schema::hasColumn('reports', 'reporter_score_applied_at')) {
                $table->timestamp('reporter_score_applied_at')->nullable()->after('reporter_score_outcome');
            }
        });

        Schema::create('reporter_risk_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('false_report_count')->default(0);
            $table->unsignedInteger('valid_report_count')->default(0);
            $table->unsignedInteger('risk_score')->default(0);
            $table->timestamp('last_false_report_at')->nullable();
            $table->timestamp('last_valid_report_at')->nullable();
            $table->timestamps();

            $table->index(['risk_score', 'updated_at']);
            $table->index(['false_report_count', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reporter_risk_scores');

        Schema::table('reports', function (Blueprint $table) {
            foreach ([
                'reporter_score_applied_at',
                'reporter_score_outcome',
                'reporter_user_agent',
                'reporter_ip_address',
            ] as $column) {
                if (Schema::hasColumn('reports', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
