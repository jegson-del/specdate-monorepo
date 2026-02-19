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
        // Ensure title and message are persisted in the data payload for in-app display
        if ($title && !isset($data['title'])) {
            $data['title'] = $title;
        }
        if ($body && !isset($data['message'])) {
            $data['message'] = $body;
        }

        // 1. Store in Database
        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => $type,
            'data' => $data,
        ]);

        // 2. Broadcast via Pusher/Echo
        event(new \App\Events\NotificationCreated($notification));

        // 3. Send Push Notification
        $osAppId = config('services.onesignal.app_id');
        $osKey = config('services.onesignal.rest_api_key');

        if ($osAppId && $osKey) {
            $this->sendOneSignalPush((string) $user->id, $title ?? 'New Notification', $body ?? 'You have a new notification', $data, $osAppId, $osKey);
        } elseif ($user->expo_push_token) {
            $this->sendExpoPush($user->expo_push_token, $title ?? 'New Notification', $body ?? 'You have a new notification', $data);
        }

        return $notification;
    }

    /**
     * Send Push Notification via OneSignal using external_user_id.
     */
    protected function sendOneSignalPush(string $userId, string $title, string $body, array $data, string $appId, string $apiKey): void
    {

        try {
            /** @var \Illuminate\Http\Client\Response $response */
            $response = Http::withHeaders([
                'Authorization' => 'Basic ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->post('https://api.onesignal.com/notifications', [
                'app_id' => $appId,
                'include_external_user_ids' => [$userId],
                'channel_for_external_user_ids' => 'push',
                'headings' => ['en' => $title],
                'contents' => ['en' => $body],
                'data' => $data,
            ]);

            if ($response->failed()) {
                Log::error('OneSignal Push Failed', ['user_id' => $userId, 'response' => $response->body()]);
            }
        } catch (\Exception $e) {
            Log::error('OneSignal Push Exception', ['message' => $e->getMessage()]);
        }
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
