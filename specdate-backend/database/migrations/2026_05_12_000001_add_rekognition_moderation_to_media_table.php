<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->string('moderation_status', 32)->default('pending')->after('hidden_reason');
            $table->json('moderation_labels')->nullable()->after('moderation_status');
            $table->string('rekognition_job_id')->nullable()->after('moderation_labels');
            $table->timestamp('moderation_checked_at')->nullable()->after('rekognition_job_id');
            $table->text('moderation_error')->nullable()->after('moderation_checked_at');
        });

        // Rows created before this feature should not stay "pending" in the UI.
        DB::table('media')->update([
            'moderation_status' => 'approved',
            'moderation_labels' => json_encode(['skipped' => true, 'reason' => 'legacy_before_rekognition']),
        ]);
    }

    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropColumn([
                'moderation_status',
                'moderation_labels',
                'rekognition_job_id',
                'moderation_checked_at',
                'moderation_error',
            ]);
        });
    }
};
