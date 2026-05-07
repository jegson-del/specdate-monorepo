<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('spec.{specId}', function ($user, $specId) {
    // Ensure user is authorized to view this spec
    return $user != null;
});

Broadcast::channel('chat.{threadId}', function ($user, $threadId) {
    return app(\App\Services\ChatService::class)->userCanAccessThread($user, (int) $threadId);
});
