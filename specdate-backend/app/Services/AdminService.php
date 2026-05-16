<?php

namespace App\Services;

use App\Models\DateVoucher;
use App\Models\Media;
use App\Models\ProviderProfile;
use App\Models\Report;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminService
{
    private const ADMIN_LOGIN_OTP_TTL_SECONDS = 600;
    private const ADMIN_LOGIN_OTP_MAX_ATTEMPTS = 5;

    public function __construct(
        private AdminAccessService $adminAccessService,
        private AdminProviderService $adminProviderService,
        private AuthService $authService,
    )
    {
    }

    public function login(array $credentials): array
    {
        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            Log::warning('Admin login password check failed', [
                'email' => $credentials['email'],
            ]);
            throw new HttpException(401, 'Invalid admin credentials.');
        }

        if (!$user || $user->role !== 'admin') {
            Log::warning('Non-admin user attempted admin login', [
                'user_id' => $user?->id,
                'email' => $credentials['email'],
            ]);
            throw new HttpException(403, 'Admin access required.');
        }

        $access = $user->adminAccess()->first();
        if (!$access || !$access->approved_at) {
            Log::warning('Unapproved admin attempted login', [
                'user_id' => $user->id,
                'email' => $credentials['email'],
            ]);
            throw new HttpException(403, 'Admin account is awaiting approval.');
        }

        $sent = $this->authService->sendOtp('email', $user->email);
        if (!($sent['success'] ?? false)) {
            Log::warning('Admin login OTP email failed', [
                'user_id' => $user->id,
                'email' => $user->email,
            ]);
            throw new HttpException(503, $sent['message'] ?? 'Could not send admin verification code.');
        }

        $challenge = Str::random(64);
        Cache::put($this->adminLoginChallengeKey($challenge), [
            'email' => strtolower($user->email),
            'user_id' => $user->id,
        ], self::ADMIN_LOGIN_OTP_TTL_SECONDS);

        return [
            'requires_otp' => true,
            'login_challenge' => $challenge,
            'email' => $user->email,
            'expires_in' => self::ADMIN_LOGIN_OTP_TTL_SECONDS,
        ];
    }

    public function verifyLoginOtp(array $data): array
    {
        $challenge = (string) $data['login_challenge'];
        $challengeKey = $this->adminLoginChallengeKey($challenge);
        $payload = Cache::get($challengeKey);
        $email = strtolower(trim((string) $data['email']));

        if (!$payload || ($payload['email'] ?? null) !== $email) {
            Log::warning('Admin login OTP challenge rejected', [
                'email' => $email,
            ]);
            throw new HttpException(422, 'Invalid or expired admin verification challenge.');
        }

        $attemptKey = $this->adminLoginAttemptKey($challenge);
        Cache::add($attemptKey, 0, self::ADMIN_LOGIN_OTP_TTL_SECONDS);
        $attempts = Cache::increment($attemptKey);

        if ($attempts > self::ADMIN_LOGIN_OTP_MAX_ATTEMPTS) {
            Cache::forget($challengeKey);
            Cache::forget($attemptKey);
            Log::warning('Admin login OTP attempts exceeded', [
                'email' => $email,
                'user_id' => $payload['user_id'] ?? null,
            ]);
            throw new HttpException(429, 'Too many verification attempts. Please request a new code.');
        }

        if (!$this->authService->verifyOtp('email', $email, (string) $data['otp_code'])) {
            Log::warning('Admin login OTP verification failed', [
                'email' => $email,
                'user_id' => $payload['user_id'] ?? null,
                'attempts' => $attempts,
            ]);
            throw new HttpException(422, 'Invalid or expired admin verification code.');
        }

        Cache::forget($challengeKey);
        Cache::forget($attemptKey);

        $user = User::find($payload['user_id']);
        if (!$user || $user->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }

        return [
            'user' => $this->adminPayload($user),
            'token' => $user->createToken('admin_dashboard')->plainTextToken,
        ];
    }

    public function adminPayload(User $admin): array
    {
        $this->ensureAdmin($admin);

        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => $admin->role,
            'admin_access' => $this->adminAccessService->accessPayload($admin->adminAccess()->first()),
        ];
    }

    public function dashboard(User $admin): array
    {
        $this->ensureAdmin($admin);

        $providerStatus = $this->providerStatusCounts();
        $voucherStatuses = $this->voucherStatusCounts();
        $reportsOpen = Report::whereIn('status', ['open', 'reviewing'])->count();
        $mediaNeedsReview = $this->mediaNeedsReviewCount();

        return [
            'stats' => [
                'users_total' => User::count(),
                'daters_total' => User::where('role', 'user')->count(),
                'providers_total' => $providerStatus['total'],
                'providers_pending' => $providerStatus['pending'],
                'providers_approved' => $providerStatus['approved'],
                'providers_rejected' => $providerStatus['rejected'],
                'admins_total' => User::where('role', 'admin')->count(),
                'reports_open' => $reportsOpen,
                'media_needs_review' => $mediaNeedsReview,
                'media_stale_scans' => $this->staleScanCount(),
                'moderation_needs_review' => $reportsOpen + $mediaNeedsReview,
                'support_needs_admin' => SupportTicket::whereNotNull('user_id')
                    ->whereIn('status', ['open', 'pending_admin'])
                    ->count(),
                'contact_needs_admin' => SupportTicket::whereNull('user_id')
                    ->whereNotNull('contact_email')
                    ->whereIn('status', ['open', 'pending_admin'])
                    ->count(),
                'vouchers_total' => DateVoucher::count(),
                'vouchers_redeemed' => $voucherStatuses['redeemed'],
            ],
            'provider_status' => $providerStatus,
            'voucher_status' => $voucherStatuses,
            'recent_providers' => $this->recentProviders(),
        ];
    }

    public function providerApplications(User $admin, ?string $status = null, ?string $search = null, int $perPage = 25, ?string $country = null): LengthAwarePaginator
    {
        $this->ensureAdmin($admin);

        $search = trim((string) $search);
        $country = trim((string) $country);
        $perPage = max(1, min($perPage, 100));

        $providers = ProviderProfile::query()
            ->with(['user:id,name,email,mobile,role,created_at', 'categories:id,name,slug'])
            ->when($status === 'pending', fn ($q) => $q->where('is_verified', false)->whereNull('rejected_at'))
            ->when($status === 'approved', fn ($q) => $q->where('is_verified', true))
            ->when($status === 'rejected', fn ($q) => $q->whereNotNull('rejected_at'))
            ->when($country !== '', fn ($q) => $q->where('country', $country))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($nested) use ($search) {
                    $nested->where('company_name', 'like', "%{$search}%")
                        ->orWhere('country', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($user) => $user
                            ->where('email', 'like', "%{$search}%")
                            ->orWhere('mobile', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate($perPage);

        $providers->getCollection()->transform(fn (ProviderProfile $profile) => $this->adminProviderService->providerPayload($profile));

        return $providers;
    }

    public function ensureAdmin(?User $user): void
    {
        if (!$user || $user->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }
    }

    private function providerStatusCounts(): array
    {
        return [
            'pending' => ProviderProfile::where('is_verified', false)->whereNull('rejected_at')->count(),
            'approved' => ProviderProfile::where('is_verified', true)->count(),
            'rejected' => ProviderProfile::whereNotNull('rejected_at')->count(),
            'total' => ProviderProfile::count(),
        ];
    }

    private function voucherStatusCounts(): array
    {
        $statuses = DateVoucher::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'pending_provider' => (int) ($statuses[DateVoucher::STATUS_PENDING_PROVIDER] ?? 0),
            'active' => (int) ($statuses[DateVoucher::STATUS_ACTIVE] ?? 0),
            'redeemed' => (int) ($statuses[DateVoucher::STATUS_REDEEMED] ?? 0),
            'completed' => (int) ($statuses[DateVoucher::STATUS_COMPLETED] ?? 0),
            'rejected' => (int) ($statuses[DateVoucher::STATUS_REJECTED] ?? 0),
            'cancelled' => (int) ($statuses[DateVoucher::STATUS_CANCELLED] ?? 0),
            'expired' => (int) ($statuses[DateVoucher::STATUS_EXPIRED] ?? 0),
        ];
    }

    private function mediaNeedsReviewCount(): int
    {
        $reportedMediaIds = Report::query()
            ->where('target_type', 'media')
            ->whereIn('status', ['open', 'reviewing'])
            ->select('target_id');

        return Media::query()
            ->where(function ($query) use ($reportedMediaIds) {
                $query->whereIn('moderation_status', ['pending', 'scanning', 'manual_pending', 'flagged', 'failed'])
                    ->orWhereIn('id', $reportedMediaIds);
            })
            ->count();
    }

    private function staleScanCount(): int
    {
        return Media::query()
            ->whereIn('moderation_status', ['pending', 'scanning'])
            ->where('created_at', '<=', now()->subMinutes(15))
            ->count();
    }

    private function recentProviders(): array
    {
        return ProviderProfile::query()
            ->with(['user:id,name,email,mobile,role,created_at', 'categories:id,name,slug'])
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (ProviderProfile $profile) => $this->adminProviderService->providerPayload($profile))
            ->values()
            ->all();
    }

    private function adminLoginChallengeKey(string $challenge): string
    {
        return 'admin_login_challenge:' . hash('sha256', $challenge);
    }

    private function adminLoginAttemptKey(string $challenge): string
    {
        return 'admin_login_attempts:' . hash('sha256', $challenge);
    }
}
