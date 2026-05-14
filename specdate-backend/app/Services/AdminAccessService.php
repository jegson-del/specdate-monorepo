<?php

namespace App\Services;

use App\Models\AdminAccess;
use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminAccessService
{
    public const FINANCIAL_VOUCHERS = 'financial_vouchers';
    public const FINANCIAL_CREDITS = 'financial_credits';

    public function assertCan(User $admin, string $permission): void
    {
        $this->ensureAdmin($admin);

        if (! $this->can($admin, $permission)) {
            throw new HttpException(403, $this->messageFor($permission));
        }
    }

    public function can(User $admin, string $permission): bool
    {
        if ($admin->role !== 'admin') {
            return false;
        }

        $access = $admin->relationLoaded('adminAccess')
            ? $admin->adminAccess
            : $admin->adminAccess()->first();

        if (! $access) {
            return false;
        }

        return match ($permission) {
            self::FINANCIAL_VOUCHERS => (bool) $access->can_view_financial_vouchers,
            self::FINANCIAL_CREDITS => (bool) $access->can_view_financial_credits,
            default => false,
        };
    }

    public function accessPayload(?AdminAccess $access): array
    {
        return [
            'can_view_financial_vouchers' => (bool) ($access?->can_view_financial_vouchers ?? false),
            'can_view_financial_credits' => (bool) ($access?->can_view_financial_credits ?? false),
        ];
    }

    public function updateFinancialAccess(User $admin, User $targetAdmin, array $data): AdminAccess
    {
        $this->ensureAdmin($admin);

        if ($targetAdmin->role !== 'admin') {
            throw new HttpException(422, 'Admin access can only be assigned to admin users.');
        }

        $access = AdminAccess::firstOrNew(['admin_id' => $targetAdmin->id]);
        $access->forceFill([
            'can_view_financial_vouchers' => (bool) ($data['can_view_financial_vouchers'] ?? false),
            'can_view_financial_credits' => (bool) ($data['can_view_financial_credits'] ?? false),
        ])->save();

        return $access;
    }

    private function ensureAdmin(?User $user): void
    {
        if (! $user || $user->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }
    }

    private function messageFor(string $permission): string
    {
        return match ($permission) {
            self::FINANCIAL_VOUCHERS => 'Admin voucher financial access required.',
            self::FINANCIAL_CREDITS => 'Admin credit financial access required.',
            default => 'Admin access permission required.',
        };
    }
}
