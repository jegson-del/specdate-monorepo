<?php

namespace App\Services;

use App\Models\DateVoucher;
use App\Models\Media;
use App\Models\ProviderProfile;
use App\Models\Report;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminService
{
    public function __construct(private AdminProviderService $adminProviderService)
    {
    }

    public function login(array $credentials): array
    {
        if (!Auth::attempt($credentials)) {
            throw new HttpException(401, 'Invalid admin credentials.');
        }

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || $user->role !== 'admin') {
            Auth::logout();
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
                'support_needs_admin' => SupportTicket::whereIn('status', ['open', 'pending_admin'])->count(),
                'vouchers_total' => DateVoucher::count(),
                'vouchers_redeemed' => $voucherStatuses['redeemed'],
            ],
            'provider_status' => $providerStatus,
            'voucher_status' => $voucherStatuses,
            'recent_providers' => $this->recentProviders(),
        ];
    }

    public function providerApplications(User $admin, ?string $status = null, ?string $search = null, int $perPage = 25): LengthAwarePaginator
    {
        $this->ensureAdmin($admin);

        $search = trim((string) $search);
        $perPage = max(1, min($perPage, 100));

        $providers = ProviderProfile::query()
            ->with(['user:id,name,email,mobile,role,created_at', 'categories:id,name,slug'])
            ->when($status === 'pending', fn ($q) => $q->where('is_verified', false)->whereNull('rejected_at'))
            ->when($status === 'approved', fn ($q) => $q->where('is_verified', true))
            ->when($status === 'rejected', fn ($q) => $q->whereNotNull('rejected_at'))
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
}
