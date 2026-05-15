<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('specs:send-start-reminders')->dailyAt('08:00');
Schedule::command('chats:prune-old-messages --days=180')->dailyAt('03:30');
Schedule::command('contact-mail:import-replies')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->when(fn () => (bool) config('inbound_mail.enabled') && extension_loaded('imap'));
