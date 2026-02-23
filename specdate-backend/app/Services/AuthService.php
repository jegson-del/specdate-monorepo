<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Exceptions\HttpResponseException;
use App\Mail\NewProviderAdminNotificationMail;

class AuthService
{
    private const OTP_TTL_SECONDS = 600; // 10 minutes
    private const OTP_CACHE_PREFIX = 'otp:';

    protected $sparkService;

    public function __construct(SparkService $sparkService)
    {
        $this->sparkService = $sparkService;
    }

    /**
     * Send OTP to the given channel (email or mobile).
     * Uses OneSignal exclusively as per configuration.
     * Stores code in cache for verification.
     *
     * @param string $channel 'email' or 'mobile'
     * @param string $target  Email address or phone number
     * @return array{success: bool, message: string}
     */
    public function sendOtp(string $channel, string $target): array
    {
        $code = (string) random_int(100000, 999999);
        $key = $this->otpCacheKey($channel, $target);
        Cache::put($key, $code, self::OTP_TTL_SECONDS);

        // OneSignal (email + SMS) when ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY are set
        $osEnabled = config('services.onesignal.enabled');
        $osAppId = config('services.onesignal.app_id');
        $osKey = config('services.onesignal.rest_api_key');

        if ($osEnabled && $osAppId && $osKey) {
            $body = 'Your SpecDate verification code is: ' . $code . '. It expires in 10 minutes.';
            $sent = $this->sendViaOneSignal($channel, $target, 'Your SpecDate verification code', $body, $osAppId, $osKey);
            if ($sent) {
                return [
                    'success' => true,
                    'message' => $channel === 'email'
                        ? 'Verification code sent to your email.'
                        : 'Verification code sent to your phone.',
                ];
            }
        }

        return [
            'success' => false,
            'message' => 'Failed to send verification code via OneSignal. Please ensure you are a test recipient if the account is not yet verified.',
        ];
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

    /**
     * Send via OneSignal Email or SMS API.
     */
    private function sendViaOneSignal(string $channel, string $target, string $subject, string $body, string $appId, string $apiKey): bool
    {
        $headers = [
            'Authorization' => 'Key ' . $apiKey,
            'Content-Type' => 'application/json',
        ];

        if ($channel === 'email') {
            $response = Http::withHeaders($headers)->post('https://api.onesignal.com/notifications?c=email', [
                'app_id' => $appId,
                'email_to' => [trim($target)],
                'email_subject' => $subject,
                'email_body' => '<p>' . htmlspecialchars($body) . '</p>',
            ]);
        } else {
            $response = Http::withHeaders($headers)->post('https://api.onesignal.com/notifications?c=sms', [
                'app_id' => $appId,
                'name' => 'DateUsher OTP verification',
                'contents' => ['en' => $body],
                'include_phone_numbers' => [trim($target)],
            ]);
        }

        /** @var \Illuminate\Http\Client\Response $response */
        if ($response->successful() && ! empty($response->json('id'))) {
            return true;
        }
        Log::warning('OneSignal send failed', ['channel' => $channel, 'response' => $response->body()]);
        return false;
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
        $otpCode = isset($data['otp_code'], $data['channel'], $data['target'])
            ? trim((string) $data['otp_code'])
            : null;
        $channel = $data['channel'] ?? null;
        $target = isset($data['target']) ? trim((string) $data['target']) : null;

        if ($otpCode !== null && $channel && $target) {
            if (!$this->verifyOtp($channel, $target, $otpCode)) {
                throw new HttpResponseException(
                    response()->json([
                        'success' => false,
                        'message' => 'Invalid or expired verification code.',
                        'data' => ['errors' => ['otp_code' => ['Invalid or expired code.']]],
                    ], 422, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)
                );
            }
        }

        $name = $data['name'] ?? $data['username'];

        // 1. Create User
        $user = User::create([
            'name' => $name,
            'username' => $data['username'],
            'email' => $data['email'],
            'mobile' => $data['mobile'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'] ?? 'user',
            'terms_accepted' => filter_var($data['terms_accepted'] ?? false, FILTER_VALIDATE_BOOLEAN),
        ]);

        $osAppId = config('services.onesignal.app_id');
        $osKey = config('services.onesignal.rest_api_key');

        if ($user->role === 'provider') {
            // Create Provider Profile
            $user->providerProfile()->create([
                'city' => $data['city'] ?? null,
                'country' => $data['country'] ?? null,
                'is_verified' => false,
            ]);
            
            // Send Provider Welcome Email via OneSignal
            if ($osAppId && $osKey) {
                $this->sendViaOneSignal('email', $user->email, 'Welcome to SpecDate (Provider)', 'Welcome to SpecDate! Your provider account has been created.', $osAppId, $osKey);
            }

            // Notify Admin (optional, keeping as Laravel Mail if internal, or switch to OneSignal)
            $adminEmail = config('mail.from.address'); 
            if ($adminEmail) {
                Mail::to($adminEmail)->send(new NewProviderAdminNotificationMail($user));
            }

        } else {
            // Create User Profile with Location
            $user->profile()->create([
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'city' => $data['city'] ?? null,
                'state' => $data['state'] ?? null,
                'country' => $data['country'] ?? null,
                'continent' => $data['continent'] ?? null,
            ]);

            // Send User Welcome Email via OneSignal
            if ($osAppId && $osKey) {
                $this->sendViaOneSignal('email', $user->email, 'Welcome to SpecDate', 'Hello ' . $user->name . ', welcome to SpecDate! Your account is ready.', $osAppId, $osKey);
            }
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
}
