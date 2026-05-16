<?php

namespace App\Services;

use App\Models\AdminAccess;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminAccessService
{
    public const FINANCIAL_VOUCHERS = 'can_view_financial_vouchers';
    public const FINANCIAL_CREDITS = 'can_view_financial_credits';
    public const MANAGE_ADMIN_USERS = 'can_manage_admin_users';
    public const MANAGE_PROVIDER_INVITES = 'can_manage_provider_invites';
    public const MANAGE_CONTACT_MESSAGES = 'can_manage_contact_messages';
    public const MANAGE_SUCCESS_STORIES = 'can_manage_success_stories';

    private const LABELS = [
        self::FINANCIAL_VOUCHERS => 'Voucher financials',
        self::FINANCIAL_CREDITS => 'Credit financials',
        self::MANAGE_ADMIN_USERS => 'Admin management',
        self::MANAGE_PROVIDER_INVITES => 'Provider invites',
        self::MANAGE_CONTACT_MESSAGES => 'Contact messages',
        self::MANAGE_SUCCESS_STORIES => 'Success stories',
    ];

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

        if (! $access->approved_at) {
            return false;
        }

        return in_array($permission, $this->permissionKeys(), true)
            && (bool) ($access->{$permission} ?? false);
    }

    public function accessPayload(?AdminAccess $access): array
    {
        return collect($this->permissionKeys())
            ->mapWithKeys(fn (string $key) => [$key => (bool) ($access?->{$key} ?? false)])
            ->all();
    }

    public function permissionsPayload(): array
    {
        return collect($this->permissionKeys())
            ->map(fn (string $key) => [
                'key' => $key,
                'label' => self::LABELS[$key] ?? $this->labelize($key),
            ])
            ->values()
            ->all();
    }

    public function updateAccess(User $admin, User $targetAdmin, array $data): AdminAccess
    {
        $this->ensureAdmin($admin);
        $this->assertCan($admin, self::MANAGE_ADMIN_USERS);

        if ($targetAdmin->role !== 'admin') {
            throw new HttpException(422, 'Admin access can only be assigned to admin users.');
        }

        $access = AdminAccess::firstOrNew(['admin_id' => $targetAdmin->id]);
        $access->forceFill(
            collect($this->permissionKeys())
                ->filter(fn (string $key) => array_key_exists($key, $data))
                ->mapWithKeys(fn (string $key) => [$key => (bool) ($data[$key] ?? false)])
                ->all()
        )->save();

        return $access;
    }

    public function permissionKeys(): array
    {
        return collect(Schema::getColumnListing('admin_accesses'))
            ->filter(fn (string $column) => str_starts_with($column, 'can_'))
            ->values()
            ->all();
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
            self::MANAGE_ADMIN_USERS => 'Admin management access required.',
            self::MANAGE_PROVIDER_INVITES => 'Provider invite access required.',
            self::MANAGE_CONTACT_MESSAGES => 'Admin contact message access required.',
            self::MANAGE_SUCCESS_STORIES => 'Admin success story access required.',
            default => 'Admin access permission required.',
        };
    }

    private function labelize(string $permission): string
    {
        return str($permission)
            ->replace('can_', '')
            ->replace('_', ' ')
            ->title()
            ->toString();
    }
}
