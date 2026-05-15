<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminManagementService
{
    public function __construct(private AdminAccessService $adminAccessService)
    {
    }

    public function admins(User $admin, array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $this->ensureCanManageAdmins($admin);

        $search = trim((string) ($filters['q'] ?? ''));
        $perPage = max(1, min($perPage, 100));

        $admins = User::query()
            ->with('adminAccess')
            ->where('role', 'admin')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($nested) use ($search) {
                    $nested->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate($perPage);

        $admins->getCollection()->transform(fn (User $adminUser) => $this->adminPayload($adminUser));

        return $admins;
    }

    public function permissions(User $admin): array
    {
        $this->ensureCanManageAdmins($admin);

        return $this->adminAccessService->permissionsPayload();
    }

    public function updateAccess(User $admin, int $adminUserId, array $data): array
    {
        $this->ensureCanManageAdmins($admin);

        $targetAdmin = User::query()->findOrFail($adminUserId);

        $this->adminAccessService->updateAccess($admin, $targetAdmin, $data);

        return $this->adminPayload($targetAdmin->fresh('adminAccess'));
    }

    public function accessValidationRules(): array
    {
        return collect($this->adminAccessService->permissionKeys())
            ->mapWithKeys(fn (string $key) => [$key => 'sometimes|boolean'])
            ->all();
    }

    private function adminPayload(User $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'username' => $admin->username,
            'email' => $admin->email,
            'role' => $admin->role,
            'created_at' => $admin->created_at,
            'admin_access' => $this->adminAccessService->accessPayload($admin->adminAccess),
        ];
    }

    private function ensureCanManageAdmins(?User $admin): void
    {
        if (! $admin || $admin->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }

        $this->adminAccessService->assertCan($admin, AdminAccessService::MANAGE_ADMIN_USERS);
    }
}
