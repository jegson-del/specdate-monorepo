<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'registration_ip_address')) {
                $table->string('registration_ip_address', 45)->nullable()->after('remember_token');
                $table->index('registration_ip_address');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'registration_ip_address')) {
                $table->dropIndex(['registration_ip_address']);
                $table->dropColumn('registration_ip_address');
            }
        });
    }
};
