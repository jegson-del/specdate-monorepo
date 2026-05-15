<?php

namespace App\Http\Controllers;

use App\Models\DeviceFingerprint;
use App\Models\IpRiskEvent;
use App\Models\User;
use App\Services\AuthService;
use App\Services\DeviceFingerprintService;
use App\Services\IpRiskService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\SendOtpRequest;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected AuthService $authService,
        private DeviceFingerprintService $deviceFingerprints,
        private IpRiskService $ipRisk,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());
        $this->recordRegistrationRisk($result['user'] ?? null, $request);

        return $this->sendResponse($result, 'User registered successfully.', 201);
    }

    /**
     * Send OTP to email (or mobile when SMS is configured) for registration verification.
     */
    public function sendOtp(SendOtpRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $result = $this->authService->sendOtp(
            $validated['channel'],
            $validated['target']
        );

        return $this->sendResponse($result, $result['message'] ?? 'OTP sent.');
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->only('email', 'password'));

        if (!$result) {
            return $this->sendError('Unauthorised.', ['error' => 'Invalid credentials'], 401);
        }

        return $this->sendResponse($result, 'User logged in successfully.');
    }

    /**
     * Revoke the current access token (logout). Requires auth:sanctum.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return $this->sendResponse(null, 'Logged out successfully.');
    }

    private function recordRegistrationRisk(?User $user, Request $request): void
    {
        if (!$user) {
            return;
        }

        $ip = (string) $request->ip();
        $user->forceFill(['registration_ip_address' => $ip])->save();

        try {
            $device = $this->deviceFingerprints->capture($user, $request);
            if ($device) {
                $otherDeviceUsers = DeviceFingerprint::query()
                    ->where('fingerprint_hash', $device->fingerprint_hash)
                    ->where('user_id', '!=', $user->id)
                    ->distinct('user_id')
                    ->count('user_id');

                if ($otherDeviceUsers > 0) {
                    $this->ipRisk->recordEvent(
                        $user->id,
                        $ip,
                        IpRiskEvent::EVENT_DUPLICATE_DEVICE_REGISTRATION,
                        $request->method(),
                        $request->path(),
                        (string) $request->userAgent(),
                        [
                            'fingerprint_hash' => $device->fingerprint_hash,
                            'other_user_count' => $otherDeviceUsers,
                        ]
                    );
                }
            }

            $recentSameIpUsers = User::query()
                ->where('registration_ip_address', $ip)
                ->where('id', '!=', $user->id)
                ->where('created_at', '>=', now()->subDay())
                ->count();

            if ($recentSameIpUsers >= 2) {
                $this->ipRisk->recordEvent(
                    $user->id,
                    $ip,
                    IpRiskEvent::EVENT_REGISTRATION_IP_CLUSTER,
                    $request->method(),
                    $request->path(),
                    (string) $request->userAgent(),
                    [
                        'recent_same_ip_user_count' => $recentSameIpUsers + 1,
                    ],
                    true
                );
            }
        } catch (\Throwable $exception) {
            Log::warning('Registration risk capture failed.', [
                'user_id' => $user->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
