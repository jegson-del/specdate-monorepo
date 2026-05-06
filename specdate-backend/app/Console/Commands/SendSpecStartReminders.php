<?php

namespace App\Console\Commands;

use App\Mail\SpecReminderMail;
use App\Models\Spec;
use App\Models\SpecNotificationLog;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendSpecStartReminders extends Command
{
    private const SPEC_CHUNK_SIZE = 100;
    private const RECIPIENT_CHUNK_SIZE = 200;

    protected $signature = 'specs:send-start-reminders
        {--date= : Date to use as today, in YYYY-MM-DD format}
        {--chunk=100 : Number of specs to process per batch}';

    protected $description = 'Send today/tomorrow spec start reminders to spec owners and accepted participants.';

    public function handle(NotificationService $notifications): int
    {
        $today = $this->option('date')
            ? Carbon::parse((string) $this->option('date'))->startOfDay()
            : now()->startOfDay();

        $sent = 0;

        foreach (['tomorrow' => $today->copy()->addDay(), 'today' => $today] as $timing => $date) {
            $chunkSize = max(1, (int) ($this->option('chunk') ?: self::SPEC_CHUNK_SIZE));

            Spec::query()
                ->with('owner')
                ->whereIn('status', ['OPEN', 'ACTIVE'])
                ->whereBetween('expires_at', [$date->copy()->startOfDay(), $date->copy()->endOfDay()])
                ->orderBy('id')
                ->chunkById($chunkSize, function ($specs) use ($notifications, $timing, $date, &$sent) {
                    foreach ($specs as $spec) {
                        $sent += $this->sendSpecReminders($notifications, $spec, $timing, $date);
                    }
                });
        }

        $this->info("Sent {$sent} spec start reminder(s).");

        return self::SUCCESS;
    }

    private function sendSpecReminders(
        NotificationService $notifications,
        Spec $spec,
        string $timing,
        Carbon $date
    ): int {
        $sent = 0;
        $sentUserIds = [];

        if ($spec->owner && $this->sendReminder($notifications, $spec->owner, $spec, $timing, $date)) {
            $sent++;
            $sentUserIds[(int) $spec->owner->id] = true;
        }

        $spec->applications()
            ->where('user_role', 'participant')
            ->where('status', 'ACCEPTED')
            ->with('user')
            ->orderBy('id')
            ->chunkById(self::RECIPIENT_CHUNK_SIZE, function ($applications) use ($notifications, $spec, $timing, $date, &$sent, &$sentUserIds) {
                foreach ($applications as $application) {
                    $user = $application->user;
                    if (!$user || isset($sentUserIds[(int) $user->id])) {
                        continue;
                    }

                    if ($this->sendReminder($notifications, $user, $spec, $timing, $date)) {
                        $sent++;
                    }
                    $sentUserIds[(int) $user->id] = true;
                }
            });

        return $sent;
    }

    private function sendReminder(
        NotificationService $notifications,
        User $user,
        Spec $spec,
        string $timing,
        Carbon $date
    ): bool {
        $type = "spec_starts_{$timing}";
        $reminderKey = "{$type}_{$date->toDateString()}";

        $alreadySent = SpecNotificationLog::query()
            ->where('spec_id', $spec->id)
            ->where('user_id', $user->id)
            ->where('type', $type)
            ->where('reminder_key', $reminderKey)
            ->exists();

        if ($alreadySent) {
            return false;
        }

        $title = $timing === 'today' ? 'Your spec starts today' : 'Your spec starts tomorrow';
        $body = $timing === 'today'
            ? "'{$spec->title}' starts today. Open DateUsher to get ready."
            : "'{$spec->title}' starts tomorrow. Open DateUsher to get ready.";

        $notifications->notify(
            $user,
            $type,
            [
                'spec_id' => $spec->id,
                'spec_title' => $spec->title,
                'reminder_for' => $date->toDateString(),
            ],
            $title,
            $body
        );

        Mail::to($user->email)->send(new SpecReminderMail($user, $spec, $timing));

        SpecNotificationLog::create([
            'spec_id' => $spec->id,
            'user_id' => $user->id,
            'type' => $type,
            'reminder_key' => $reminderKey,
            'channels' => ['database', 'push', 'mail'],
            'sent_at' => now(),
        ]);

        return true;
    }
}
