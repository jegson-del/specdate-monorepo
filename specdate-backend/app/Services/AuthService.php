<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Exceptions\HttpResponseException;

class AuthService
{
    private const OTP_TTL_SECONDS = 600; // 10 minutes
    private const OTP_CACHE_PREFIX = 'otp:';

    protected $sparkService;
    protected $emailService;

    public function __construct(
        SparkService $sparkService,
        EmailService $emailService,
        private PhoneBlacklistService $phoneBlacklistService,
    )
    {
        $this->sparkService = $sparkService;
        $this->emailService = $emailService;
    }

    /**
     * Send OTP to the given channel (email or mobile).
     * Email: Laravel Mail (SMTP). Mobile: Twilio SMS.
     * Stores code in cache for verification.
     *
     * @param string $channel 'email' or 'mobile'
     * @param string $target  Email address or phone number (E.164 for SMS)
     * @return array{success: bool, message: string}
     */
    public function sendOtp(string $channel, string $target): array
    {
        if ($channel === 'mobile' && $this->phoneBlacklistService->isBlacklisted($target)) {
            throw new HttpResponseException(
                response()->json([
                    'success' => false,
                    'message' => $this->phoneBlacklistService->blockedValidationMessage(),
                    'data' => ['errors' => ['target' => [$this->phoneBlacklistService->blockedValidationMessage()]]],
                ], 422, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
            );
        }

        $code = (string) random_int(100000, 999999);
        $key = $this->otpCacheKey($channel, $target);
        Cache::put($key, $code, self::OTP_TTL_SECONDS);

        if ($channel === 'email') {
            if ($this->emailService->sendOtpEmail($target, $code)) {
                return [
                    'success' => true,
                    'message' => 'Verification code sent to your email.',
                ];
            }
            return [
                'success' => false,
                'message' => 'Failed to send verification code. Please try again.',
            ];
        }

        if ($channel === 'mobile') {
            $twilio = config('services.twilio');
            $sid = $twilio['sid'] ?? null;
            $token = $twilio['token'] ?? null;
            $from = $twilio['from'] ?? null;
            if (!$sid || !$token || !$from) {
                Log::warning('Twilio not configured for SMS OTP');
                return [
                    'success' => false,
                    'message' => 'SMS is not configured. Please use email verification.',
                ];
            }
            $body = 'Your SpecDate verification code is: ' . $code . '. It expires in 10 minutes.';
            $sent = $this->sendSmsViaTwilio($from, trim($target), $body, $sid, $token);
            if ($sent) {
                return [
                    'success' => true,
                    'message' => 'Verification code sent to your phone.',
                ];
            }
            return [
                'success' => false,
                'message' => 'Failed to send SMS. Please check the number or try email.',
            ];
        }

        return [
            'success' => false,
            'message' => 'Invalid channel.',
        ];
    }

    /**
     * Send SMS via Twilio REST API.
     */
    private function sendSmsViaTwilio(string $from, string $to, string $body, string $sid, string $authToken): bool
    {
        $url = 'https://api.twilio.com/2010-04-01/Accounts/' . $sid . '/Messages.json';
        try {
            $response = Http::withBasicAuth($sid, $authToken)
                ->asForm()
                ->post($url, [
                    'From' => $from,
                    'To' => $to,
                    'Body' => $body,
                ]);
            if ($response->successful()) {
                return true;
            }
            Log::warning('Twilio SMS failed', ['response' => $response->body()]);
            return false;
        } catch (\Throwable $e) {
            Log::warning('Twilio SMS exception', ['message' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Verify OTP for the given channel/target. Returns true if code matches.
     */
    public function verifyOtp(string $channel, string $target, string $code): bool
    {
        $key = $this->otpCacheKey($channel, $target);
        $stored = Cache::get($key);
        $valid = $stored !== null && hash_equals((string) $stored, trim((string) $code));
        if ($valid) {
            Cache::forget($key);
        }
        return $valid;
    }

    private function otpCacheKey(string $channel, string $target): string
    {
        $normalized = $channel === 'email' ? strtolower(trim($target)) : trim($target);
        return self::OTP_CACHE_PREFIX . $channel . ':' . $normalized;
    }

    /**
     * Handle user registration.
     */
    public function register(array $data): array
    {
        if ($this->phoneBlacklistService->isBlacklisted($data['mobile'] ?? null)) {
            throw new HttpResponseException(
                response()->json([
                    'success' => false,
                    'message' => $this->phoneBlacklistService->blockedValidationMessage(),
                    'data' => ['errors' => ['mobile' => [$this->phoneBlacklistService->blockedValidationMessage()]]],
                ], 422, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
            );
        }

        $otpCode = trim((string) $data['otp_code']);
        $channel = (string) $data['channel'];
        $target = trim((string) $data['target']);

        if ($channel !== 'mobile' || $this->normalizedPhone($target) !== $this->normalizedPhone((string) $data['mobile'])) {
            throw new HttpResponseException(
                response()->json([
                    'success' => false,
                    'message' => 'Phone verification must match the mobile number on the account.',
                    'data' => ['errors' => ['target' => ['Phone verification must match the mobile number.']]],
                ], 422, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
            );
        }

        if (!$this->verifyOtp($channel, $target, $otpCode)) {
            throw new HttpResponseException(
                response()->json([
                    'success' => false,
                    'message' => 'Invalid or expired verification code.',
                    'data' => ['errors' => ['otp_code' => ['Invalid or expired code.']]],
                ], 422, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
            );
        }

        $name = $data['name'] ?? $data['username'];

        $role = ($data['role'] ?? 'user') === 'provider' ? 'user' : ($data['role'] ?? 'user');

        // 1. Create User
        $user = User::create([
            'name' => $name,
            'username' => $data['username'],
            'email' => $data['email'],
            'mobile' => $data['mobile'],
            'password' => Hash::make($data['password']),
            'role' => $role,
            'terms_accepted' => filter_var($data['terms_accepted'] ?? false, FILTER_VALIDATE_BOOLEAN),
        ]);

        if ($user->role === 'provider') {
            // Create Provider Profile
            $user->providerProfile()->create([
                'city' => $data['city'] ?? null,
                'country' => $data['country'] ?? null,
                'is_verified' => false,
            ]);

            $this->emailService->sendWelcomeProvider($user);
            $this->emailService->sendNewProviderAdminNotification($user);

        } else {
            // Create User Profile with Location
            $user->profile()->create([
                'dob' => $data['dob'],
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'city' => $data['city'] ?? null,
                'state' => $data['state'] ?? null,
                'country' => $data['country'] ?? null,
                'country_code' => isset($data['country_code']) ? strtoupper((string) $data['country_code']) : null,
                'continent' => $data['continent'] ?? null,
            ]);

            $this->emailService->sendWelcomeUser($user);
        }

        // 2. Initialize Sparks
        $this->sparkService->initializeForUser($user);

        // 3. Create Token
        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token
        ];
    }

    /**
     * Handle user login.
     *
     * @param array $credentials
     * @return array|null Returns null on failure
     */
    public function login(array $credentials): ?array
    {
        if (!Auth::attempt($credentials)) {
            return null;
        }

        $user = User::where('email', $credentials['email'])->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token
        ];
    }

    private function normalizedPhone(string $phone): string
    {
        return preg_replace('/\s+/', '', trim($phone)) ?? trim($phone);
    }
}
