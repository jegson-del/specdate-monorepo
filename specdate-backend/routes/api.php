<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/user', function (Request $request) {
        $user = $request->user()->load(['balance', 'profile', 'balloonSkin']);
        // Use safe JSON options to avoid 500 "Syntax error" from invalid UTF-8.
        return response()->json($user->toArray(), 200, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    });
    Route::put('/profile', [\App\Http\Controllers\ProfileController::class, 'update']);
    
    Route::get('/my-specs', [\App\Http\Controllers\SpecController::class, 'mySpecs']);
    Route::post('/specs/{id}/join', [\App\Http\Controllers\SpecController::class, 'join']);
    Route::post('/specs/{id}/applications/{applicationId}/approve', [\App\Http\Controllers\SpecController::class, 'approveApplication']);
    Route::post('/specs/{id}/applications/{applicationId}/reject', [\App\Http\Controllers\SpecController::class, 'rejectApplication']);
    Route::post('/specs/{id}/applications/{applicationId}/eliminate', [\App\Http\Controllers\SpecController::class, 'eliminateApplication']);
    Route::post('/specs/{id}/like', [\App\Http\Controllers\SpecController::class, 'toggleLike']);
    Route::apiResource('specs', \App\Http\Controllers\SpecController::class);
});
