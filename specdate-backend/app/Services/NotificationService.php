<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send a notification to a user via Database and Expo Push.
     *
     * @param User $user The recipient
     * @param string $type The notification type (e.g., 'join_request')
     * @param array $data Additional data payload
     * @param string|null $title Title for the push notification
     * @param string|null $body Body text for the push notification
     * @return Notification
     */
    public function notify(User $user, string $type, array $data, ?string $title = null, ?string $body = null): Notification
    {
        // 1. Store in Database
        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'data' => $data,
        ]);

        // 2. Broadcast via Pusher/Echo
        event(new \App\Events\NotificationCreated($notification));

        // 3. Send Expo Push Notification (if token exists)
        if ($user->expo_push_token) {
            $this->sendExpoPush($user->expo_push_token, $title ?? 'New Notification', $body ?? 'You have a new notification', $data);
        }

        return $notification;
    }

    /**
     * Mark a notification as read.
     */
    public function markAsRead(Notification $notification): void
    {
        $notification->update(['read_at' => now()]);
    }

    /**
     * Send HTTP request to Expo Push API.
     */
    protected function sendExpoPush(string $token, string $title, string $body, array $data): void
    {
        try {
            $response = Http::post('https://exp.host/--/api/v2/push/send', [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'sound' => 'default',
            ]);

            if ($response->failed()) {
                Log::error('Expo Push Failed', ['response' => $response->body()]);
            }
        } catch (\Exception $e) {
            Log::error('Expo Push Exception', ['message' => $e->getMessage()]);
        }
    }
}
