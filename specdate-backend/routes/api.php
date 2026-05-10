<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\Api\CreditsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BlockController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\DateVoucherController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProviderController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\SpecController;
use App\Http\Controllers\SupportController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/send-otp', [AuthController::class, 'sendOtp']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/account/pause', [AccountController::class, 'pause']);
    Route::post('/account/unpause', [AccountController::class, 'unpause']);
    Route::delete('/account', [AccountController::class, 'delete']);

    Route::get('/user', [MeController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);

    Route::get('/providers', [ProviderController::class, 'index']);
    Route::get('/providers/{provider}/reviews', [ProviderController::class, 'reviews']);
    Route::get('/providers/{provider}', [ProviderController::class, 'show']);
    Route::get('/my-specs', [SpecController::class, 'mySpecs']);
    Route::get('/dates', [SpecController::class, 'myDates']);
    Route::get('/date-vouchers', [DateVoucherController::class, 'index']);
    Route::post('/date-vouchers/preview', [DateVoucherController::class, 'preview']);
    Route::post('/date-vouchers', [DateVoucherController::class, 'store']);
    Route::get('/date-vouchers/{voucher}', [DateVoucherController::class, 'show']);
    Route::get('/chats', [ChatController::class, 'index']);
    Route::post('/providers/{provider}/chat', [ChatController::class, 'openProviderThread']);
    Route::get('/chats/{thread}', [ChatController::class, 'show']);
    Route::post('/chats/{thread}/messages', [ChatController::class, 'sendMessage']);
    Route::post('/chats/{thread}/read', [ChatController::class, 'markRead']);
    Route::get('/blocks', [BlockController::class, 'index']);
    Route::post('/blocks', [BlockController::class, 'store']);
    Route::delete('/blocks/{user}', [BlockController::class, 'destroy']);
    Route::post('/reports', [ReportController::class, 'store']);
    Route::get('/review-prompts', [ReviewController::class, 'pending']);
    Route::get('/date-vouchers/{voucher}/review-context', [ReviewController::class, 'context']);
    Route::post('/date-vouchers/{voucher}/provider-review', [ReviewController::class, 'provider']);
    Route::post('/date-vouchers/{voucher}/partner-review', [ReviewController::class, 'partner']);
    Route::post('/date-vouchers/{voucher}/review-dismiss', [ReviewController::class, 'dismiss']);
    Route::get('/admin/reports', [ReportController::class, 'index']);
    Route::patch('/admin/reports/{report}', [ReportController::class, 'update']);
    Route::get('/support/tickets', [SupportController::class, 'index']);
    Route::post('/support/tickets', [SupportController::class, 'store']);
    Route::get('/support/tickets/{ticket}', [SupportController::class, 'show']);
    Route::post('/support/tickets/{ticket}/messages', [SupportController::class, 'sendMessage']);
    Route::post('/support/tickets/{ticket}/read', [SupportController::class, 'markRead']);
    Route::patch('/support/tickets/{ticket}', [SupportController::class, 'update']);
    Route::post('/specs/{id}/join', [SpecController::class, 'join']);
    Route::post('/specs/{id}/applications/{applicationId}/approve', [SpecController::class, 'approveApplication']);
    Route::post('/specs/{id}/applications/{applicationId}/reject', [SpecController::class, 'rejectApplication']);
    Route::post('/specs/{id}/applications/{applicationId}/eliminate', [SpecController::class, 'eliminateApplication']);
    Route::post('/specs/{id}/like', [SpecController::class, 'toggleLike']);
    Route::post('/specs/{id}/match', [SpecController::class, 'createDate']);
    Route::post('/specs/{id}/extend-search', [SpecController::class, 'extendSearch']);
    Route::post('/media/upload', [MediaController::class, 'upload']);
    Route::get('/user/requests', [SpecController::class, 'pendingRequests']);
    Route::apiResource('specs', SpecController::class);

    Route::post('/specs/{id}/rounds', [SpecController::class, 'startRound']);
    Route::post('/rounds/{roundId}/answer', [SpecController::class, 'submitAnswer']);
    Route::post('/rounds/{roundId}/close', [SpecController::class, 'closeRound']);
    Route::post('/rounds/{roundId}/eliminate/{userId}', [SpecController::class, 'eliminateUser']);
    Route::post('/rounds/{roundId}/eliminate', [SpecController::class, 'eliminateUsers']);
    Route::post('/rounds/{roundId}/nudge', [SpecController::class, 'nudgeUsers']);
    Route::post('/rounds/{roundId}/update', [SpecController::class, 'updateRound']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::post('/user/push-token', [NotificationController::class, 'updatePushToken']);

    Route::get('/credits/products', [CreditsController::class, 'products']);
    Route::post('/credits/grant', [CreditsController::class, 'grant']);
    Route::get('/credits/transactions', [CreditsController::class, 'transactions']);

    Route::prefix('provider')->group(function () {
        Route::get('/dashboard', [ProviderController::class, 'getDashboard']);
        Route::get('/bookings', [DateVoucherController::class, 'providerBookings']);
        Route::post('/bookings/{voucher}/approve', [DateVoucherController::class, 'approve']);
        Route::post('/bookings/{voucher}/reject', [DateVoucherController::class, 'reject']);
        Route::post('/settings', [ProviderController::class, 'updateSettings']);
        Route::post('/scan-qr', [ProviderController::class, 'scanQRCode']);
        Route::get('/categories', [ProviderController::class, 'getCategories']);
    });
});
