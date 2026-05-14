<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        foreach ([
            'chat_messages',
            'support_tickets',
            'support_messages',
            'spec_rounds',
            'spec_round_answers',
        ] as $table) {
            DB::statement("ALTER TABLE {$table} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        }
    }

    public function down(): void
    {
        // Intentionally no-op: downgrading to utf8/utf8mb3 could corrupt stored emoji content.
    }
};
