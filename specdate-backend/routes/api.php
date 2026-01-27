<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/user', function (Request $request) {
        $user = $request->user()->load(['balance', 'profile', 'balloonSkin', 'media']);
        $data = $user->toArray();
        // Expose avatar URL and media id so mobile can send media_id when editing (update that row).
        $avatarMedia = $user->media->where('type', 'avatar')->sortByDesc('id')->first();
        if (isset($data['profile']) && is_array($data['profile'])) {
            $data['profile']['avatar'] = $avatarMedia ? $avatarMedia->url : null;
            $data['profile']['avatar_media_id'] = $avatarMedia?->id;
        }
        // Expose profile_gallery with id+url so mobile can send media_id when replacing a slot (max 6).
        $gallery = $user->media->where('type', 'profile_gallery')->sortByDesc('id')->take(6)->values();
        $data['profile_gallery_media'] = $gallery->map(fn ($m) => ['id' => $m->id, 'url' => $m->url])->all();
        return response()->json($data, 200, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    });
    Route::put('/profile', [\App\Http\Controllers\ProfileController::class, 'update']);
    Route::get('/users/{id}', [\App\Http\Controllers\UserController::class, 'show']);
    
    Route::get('/my-specs', [\App\Http\Controllers\SpecController::class, 'mySpecs']);
    Route::post('/specs/{id}/join', [\App\Http\Controllers\SpecController::class, 'join']);
    Route::post('/specs/{id}/applications/{applicationId}/approve', [\App\Http\Controllers\SpecController::class, 'approveApplication']);
    Route::post('/specs/{id}/applications/{applicationId}/reject', [\App\Http\Controllers\SpecController::class, 'rejectApplication']);
    Route::post('/specs/{id}/applications/{applicationId}/eliminate', [\App\Http\Controllers\SpecController::class, 'eliminateApplication']);
    Route::post('/specs/{id}/like', [\App\Http\Controllers\SpecController::class, 'toggleLike']);
    Route::post('/media/upload', [\App\Http\Controllers\MediaController::class, 'upload']);
    Route::apiResource('specs', \App\Http\Controllers\SpecController::class);
});
