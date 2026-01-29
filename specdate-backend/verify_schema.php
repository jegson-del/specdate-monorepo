<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;

echo "Notifications Table: " . (Schema::hasTable('notifications') ? 'EXISTS' : 'MISSING') . "\n";
echo "Users Expo Token: " . (Schema::hasColumn('users', 'expo_push_token') ? 'YES' : 'NO') . "\n";
