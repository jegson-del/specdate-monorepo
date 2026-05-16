<?php

namespace App\Services;

use App\Models\AdminAccess;
use App\Models\AdminInvite;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminInviteService
{
    public function __construct(
        private AdminAccessService $adminAccess,
        private AuthService $authService,
        private EmailService $emailService,
    ) {}

    public function list(User $admin, array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $this->ensureCanManage($admin);

        $search = trim((string) ($filters['q'] ?? ''));
        $invites = AdminInvite::query()
            ->with(['inviter:id,name,email', 'registeredUser:id,name,email,username,role', 'approver:id,name,email'])
            ->when($search !== '', fn ($query) => $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%");
            }))
            ->latest()
            ->paginate(max(1, min($perPage, 100)));

        $invites->getCollection()->transform(fn (AdminInvite $invite) => $this->payload($invite));

        return $invites;
    }

    public function create(User $admin, array $data): array
    {
        $this->ensureCanManage($admin);

        [$token, $hash] = $this->tokenPair();
        $invite = AdminInvite::create([
            'name' => trim((string) ($data['name'] ?? '')) ?: null,
            'email' => strtolower(trim((string) $data['email'])),
            'token_hash' => $hash,
            'invited_by' => $admin->id,
            'expires_at' => now()->addDays(3),
        ]);

        $sent = $this->emailService->sendAdminInvite($invite, $this->inviteUrl($token));

        return array_merge($this->payload($invite->fresh('inviter')), ['email_sent' => $sent]);
    }

    public function publicPayload(string $token): array
    {
        $invite = $this->validInviteForToken($token);

        return [
            'name' => $invite->name,
            'email' => $invite->email,
            'email_verified_at' => $invite->email_verified_at,
            'expires_at' => $invite->expires_at,
        ];
    }

    public function sendOtp(string $token): void
    {
        $invite = $this->validInviteForToken($token);
        $sent = $this->authService->sendOtp('email', $invite->email);
        if (!($sent['success'] ?? false)) {
            throw new HttpException(503, $sent['message'] ?? 'Could not send verification code.');
        }
    }

    public function register(string $token, array $data): array
    {
        $invite = $this->validInviteForToken($token);
        $email = strtolower(trim((string) $data['email']));
        if ($email !== strtolower($invite->email)) {
            throw new HttpException(422, 'This admin invite is for a different email address.');
        }
        if (!$this->authService->verifyOtp('email', $email, (string) $data['otp_code'])) {
            throw new HttpException(422, 'Invalid or expired verification code.');
        }

        $user = DB::transaction(function () use ($invite, $data, $email) {
            $user = User::create([
                'name' => trim((string) ($data['name'] ?? $invite->name ?? $email)),
                'username' => $this->uniqueUsername((string) ($data['username'] ?? $invite->name ?? 'admin')),
                'email' => $email,
                'mobile' => '+100' . random_int(1000000000, 9999999999),
                'password' => Hash::make((string) $data['password']),
                'role' => 'admin',
                'email_verified_at' => now(),
                'terms_accepted' => true,
            ]);

            AdminAccess::create(['admin_id' => $user->id]);

            $invite->forceFill([
                'email_verified_at' => now(),
                'registered_user_id' => $user->id,
            ])->save();

            return $user;
        });

        return ['user' => ['id' => $user->id, 'email' => $user->email], 'status' => 'awaiting_approval'];
    }

    public function approve(User $admin, int $inviteId): array
    {
        $this->ensureCanManage($admin);

        $invite = AdminInvite::with('registeredUser.adminAccess')->findOrFail($inviteId);
        if (!$invite->registeredUser || $invite->registeredUser->role !== 'admin') {
            throw new HttpException(422, 'This invite has not been registered yet.');
        }

        $access = AdminAccess::firstOrNew(['admin_id' => $invite->registeredUser->id]);
        $access->forceFill([
            'approved_at' => $access->approved_at ?? now(),
            'approved_by' => $admin->id,
        ])->save();

        $invite->forceFill([
            'approved_at' => $invite->approved_at ?? now(),
            'approved_by' => $admin->id,
        ])->save();

        return $this->payload($invite->fresh(['inviter', 'registeredUser', 'approver']));
    }

    public function revoke(User $admin, int $inviteId): array
    {
        $this->ensureCanManage($admin);

        $invite = AdminInvite::findOrFail($inviteId);
        $invite->forceFill(['revoked_at' => now()])->save();

        return $this->payload($invite->fresh(['inviter', 'registeredUser', 'approver']));
    }

    private function validInviteForToken(string $token): AdminInvite
    {
        $invite = AdminInvite::where('token_hash', hash('sha256', $token))->first();
        if (!$invite || $invite->revoked_at || $invite->registered_user_id || $invite->expires_at->isPast()) {
            throw new HttpException(422, 'This admin invite is invalid or expired.');
        }

        return $invite;
    }

    private function payload(AdminInvite $invite): array
    {
        return [
            'id' => $invite->id,
            'name' => $invite->name,
            'email' => $invite->email,
            'status' => $this->status($invite),
            'expires_at' => $invite->expires_at,
            'email_verified_at' => $invite->email_verified_at,
            'registered_user_id' => $invite->registered_user_id,
            'approved_at' => $invite->approved_at,
            'revoked_at' => $invite->revoked_at,
            'created_at' => $invite->created_at,
        ];
    }

    private function status(AdminInvite $invite): string
    {
        if ($invite->revoked_at) return 'revoked';
        if ($invite->approved_at) return 'approved';
        if ($invite->registered_user_id) return 'awaiting_approval';
        if ($invite->expires_at->isPast()) return 'expired';
        return 'pending';
    }

    private function inviteUrl(string $token): string
    {
        return rtrim((string) config('app.frontend_url', config('app.url')), '/') . '/admin/invite?token=' . urlencode($token);
    }

    private function tokenPair(): array
    {
        $token = Str::random(64);
        return [$token, hash('sha256', $token)];
    }

    private function uniqueUsername(string $base): string
    {
        $slug = Str::slug($base) ?: 'admin';
        $candidate = $slug;
        $i = 1;
        while (User::where('username', $candidate)->exists()) {
            $candidate = $slug . '-' . (++$i);
        }
        return $candidate;
    }

    private function ensureCanManage(User $admin): void
    {
        $this->adminAccess->assertCan($admin, AdminAccessService::MANAGE_ADMIN_USERS);
    }
}
