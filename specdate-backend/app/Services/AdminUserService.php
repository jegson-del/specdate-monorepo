<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminUserService
{
    public function index(User $admin, array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $this->ensureAdmin($admin);

        $search = trim((string) ($filters['q'] ?? ''));
        $role = $filters['role'] ?? null;
        $status = $filters['status'] ?? null;
        $perPage = max(1, min($perPage, 100));

        $users = User::query()
            ->with(['providerProfile:id,user_id,company_name,is_verified,rejected_at', 'bannedBy:id,name,email'])
            ->whereIn('role', ['user', 'provider'])
            ->when($role && in_array($role, ['user', 'provider'], true), fn ($q) => $q->where('role', $role))
            ->when($status === 'active', fn ($q) => $q->where('is_paused', false)->whereNull('banned_at'))
            ->when($status === 'paused', fn ($q) => $q->where('is_paused', true)->whereNull('banned_at'))
            ->when($status === 'suspended', fn ($q) => $q->whereNotNull('suspended_until')->where('suspended_until', '>', now())->whereNull('banned_at'))
            ->when($status === 'banned', fn ($q) => $q->whereNotNull('banned_at'))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($nested) use ($search) {
                    $nested->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('mobile', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate($perPage);

        $users->getCollection()->transform(fn (User $user) => $this->userPayload($user));

        return $users;
    }

    public function show(User $admin, int $userId): array
    {
        $this->ensureAdmin($admin);

        return $this->userPayload($this->userQuery()->findOrFail($userId));
    }

    public function pause(User $admin, int $userId): array
    {
        $user = $this->enforceableUser($admin, $userId);
        $user->forceFill([
            'is_paused' => true,
            'moderation_status' => 'suspended',
        ])->save();

        return $this->userPayload($user->fresh(['providerProfile', 'bannedBy']));
    }

    public function unpause(User $admin, int $userId): array
    {
        $user = $this->enforceableUser($admin, $userId);
        $user->forceFill([
            'is_paused' => false,
            'suspended_until' => null,
            'moderation_status' => $this->moderationStatusWithoutSuspension($user),
        ])->save();

        return $this->userPayload($user->fresh(['providerProfile', 'bannedBy']));
    }

    public function ban(User $admin, int $userId, string $reason): array
    {
        $user = $this->enforceableUser($admin, $userId);
        $user->forceFill([
            'banned_at' => now(),
            'ban_reason' => trim($reason),
            'banned_by' => $admin->id,
            'is_paused' => true,
            'moderation_status' => 'permanently_banned',
        ])->save();
        $user->tokens()->delete();

        return $this->userPayload($user->fresh(['providerProfile', 'bannedBy']));
    }

    public function unban(User $admin, int $userId): array
    {
        $user = $this->enforceableUser($admin, $userId);
        $user->forceFill([
            'banned_at' => null,
            'ban_reason' => null,
            'banned_by' => null,
            'is_paused' => false,
            'suspended_until' => null,
            'moderation_status' => $this->moderationStatusWithoutSuspension($user),
        ])->save();

        return $this->userPayload($user->fresh(['providerProfile', 'bannedBy']));
    }

    public function updateNote(User $admin, int $userId, ?string $note): array
    {
        $user = $this->enforceableUser($admin, $userId);
        $user->forceFill(['admin_note' => trim((string) $note) ?: null])->save();

        return $this->userPayload($user->fresh(['providerProfile', 'bannedBy']));
    }

    private function enforceableUser(User $admin, int $userId): User
    {
        $this->ensureAdmin($admin);

        if ((int) $admin->id === $userId) {
            throw new HttpException(422, 'Admins cannot enforce actions against their own account.');
        }

        return $this->userQuery()->findOrFail($userId);
    }

    private function ensureAdmin(?User $user): void
    {
        if (!$user || $user->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }
    }

    private function userQuery()
    {
        return User::query()
            ->whereIn('role', ['user', 'provider'])
            ->with([
                'providerProfile:id,user_id,company_name,is_verified,rejected_at',
                'bannedBy:id,name,email',
                'reporterRiskScore',
            ])
            ->withCount(['deviceFingerprints', 'ipRiskEvents']);
    }

    private function userPayload(User $user): array
    {
        $reporterRisk = $user->reporterRiskScore;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'role' => $user->role,
            'status' => $this->statusFor($user),
            'moderation_status' => $user->moderation_status ?? $this->statusFor($user),
            'strike_count' => (int) ($user->strike_count ?? 0),
            'risk_score' => (int) ($user->risk_score ?? 0),
            'last_violation_at' => $user->last_violation_at,
            'suspended_until' => $user->suspended_until,
            'is_paused' => (bool) $user->is_paused,
            'banned_at' => $user->banned_at,
            'ban_reason' => $user->ban_reason,
            'admin_note' => $user->admin_note,
            'created_at' => $user->created_at,
            'provider_profile' => $user->providerProfile ? [
                'id' => $user->providerProfile->id,
                'company_name' => $user->providerProfile->company_name,
                'is_verified' => (bool) $user->providerProfile->is_verified,
                'status' => $user->providerProfile->is_verified
                    ? 'approved'
                    : ($user->providerProfile->rejected_at ? 'rejected' : 'pending'),
            ] : null,
            'banned_by' => $user->bannedBy ? [
                'id' => $user->bannedBy->id,
                'name' => $user->bannedBy->name,
                'email' => $user->bannedBy->email,
            ] : null,
            'risk_summary' => [
                'user_risk_score' => (int) ($user->risk_score ?? 0),
                'strike_count' => (int) ($user->strike_count ?? 0),
                'device_count' => (int) ($user->device_fingerprints_count ?? $user->deviceFingerprints()->count()),
                'ip_risk_events_count' => (int) ($user->ip_risk_events_count ?? $user->ipRiskEvents()->count()),
                'false_report_count' => (int) ($reporterRisk?->false_report_count ?? 0),
                'valid_report_count' => (int) ($reporterRisk?->valid_report_count ?? 0),
                'reporter_risk_score' => (int) ($reporterRisk?->risk_score ?? 0),
                'last_false_report_at' => $reporterRisk?->last_false_report_at,
                'last_valid_report_at' => $reporterRisk?->last_valid_report_at,
            ],
        ];
    }

    private function statusFor(User $user): string
    {
        if ($user->banned_at) {
            return 'banned';
        }
        if ($user->suspended_until && $user->suspended_until->isFuture()) {
            return 'suspended';
        }

        return $user->is_paused ? 'paused' : 'active';
    }

    private function moderationStatusWithoutSuspension(User $user): string
    {
        return (int) ($user->strike_count ?? 0) > 0 ? 'warned' : 'active';
    }
}
