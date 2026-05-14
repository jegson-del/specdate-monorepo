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

        $adminUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/')
            . '/admin/media-moderation?'
            . http_build_query([
                'status' => 'needs_review',
                'media_id' => $media->id,
            ]);

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
                    'admin_url' => $adminUrl,
                ],
                $title,
                $message
            ));
    }
}
