<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class MeController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user()->load(['balance', 'profile', 'sparkSkin', 'media']);

        $data = $user->toArray();

        $avatarMedia = $user->media->where('type', 'avatar')->sortByDesc('id')->first();
        if (isset($data['profile']) && is_array($data['profile'])) {
            $data['profile']['avatar'] = $avatarMedia ? $avatarMedia->url : null;
            $data['profile']['avatar_media_id'] = $avatarMedia?->id;
        }

        $gallery = $user->media->where('type', 'profile_gallery')->sortByDesc('id')->take(6)->values();
        $data['profile_gallery_media'] = $gallery
            ->map(fn ($media) => ['id' => $media->id, 'url' => $media->url])
            ->all();

        $data['unread_requests_count'] = $user->notifications()
            ->whereNull('read_at')
            ->where('type', 'join_request')
            ->count();

        $data['unread_notifications_count'] = $user->notifications()
            ->whereNull('read_at')
            ->where('type', '!=', 'join_request')
            ->where('type', '!=', 'chat_message')
            ->count();

        $data['unread_chat_count'] = \App\Models\ChatMessage::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id)
            ->whereHas('thread', function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                    ->orWhere('winner_user_id', $user->id);
            })
            ->count();

        return response()->json($data, 200, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }
}
