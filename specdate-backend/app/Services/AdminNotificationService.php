<?php

namespace App\Services;

use App\Models\Media;
use App\Models\Notification;
use App\Models\User;

class AdminNotificationService
{
    public function __construct(private NotificationService $notificationService)
    {
    }

    public function notifyMediaModerationCase(Media $media, string $event, string $title, string $message): void
    {
        $alreadySent = Notification::query()
            ->where('type', 'admin_media_moderation')
            ->where('data->media_id', $media->id)
            ->where('data->event', $event)
            ->exists();

        if ($alreadySent) {
            return;
        }

        User::query()
            ->where('role', 'admin')
            ->get()
            ->each(fn (User $admin) => $this->notificationService->notify(
                $admin,
                'admin_media_moderation',
                [
                    'event' => $event,
                    'media_id' => $media->id,
                    'media_type' => $media->type,
                    'moderation_status' => $media->moderation_status,
                    'url' => $media->url,
                ],
                $title,
                $message
            ));
    }
}
