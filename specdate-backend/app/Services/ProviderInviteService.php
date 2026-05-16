<?php

namespace App\Services;

use App\Models\ProviderInvite;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ProviderInviteService
{
    public function __construct(
        private AdminAccessService $adminAccess,
        private EmailService $emailService,
    ) {}

    public function list(User $admin, array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $this->ensureCanManage($admin);

        $search = trim((string) ($filters['q'] ?? ''));

        $invites = ProviderInvite::query()
            ->with('inviter:id,name,email')
            ->when($search !== '', fn ($query) => $query->where(function ($q) use ($search) {
                $q->where('provider_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->latest()
            ->paginate(max(1, min($perPage, 100)));

        $invites->getCollection()->transform(fn (ProviderInvite $invite) => $this->payload($invite));

        return $invites;
    }

    public function create(User $admin, array $data): array
    {
        $this->ensureCanManage($admin);

        [$token, $hash] = $this->tokenPair();

        $invite = ProviderInvite::create([
            'provider_name' => trim((string) $data['provider_name']),
            'email' => strtolower(trim((string) $data['email'])),
            'service_type' => $data['service_type'] ?? null,
            'personal_message' => trim((string) ($data['personal_message'] ?? '')) ?: null,
            'token_hash' => $hash,
            'invited_by' => $admin->id,
            'expires_at' => now()->addDays(14),
        ]);

        $sent = $this->emailService->sendProviderInvite($invite, $this->inviteUrl($token));

        return array_merge($this->payload($invite->fresh('inviter')), ['email_sent' => $sent]);
    }

    public function publicPayload(string $token): array
    {
        $invite = $this->validInviteForToken($token);

        return [
            'provider_name' => $invite->provider_name,
            'email' => $invite->email,
            'service_type' => $invite->service_type,
            'personal_message' => $invite->personal_message,
            'expires_at' => $invite->expires_at,
        ];
    }

    public function revoke(User $admin, int $inviteId): array
    {
        $this->ensureCanManage($admin);

        $invite = ProviderInvite::findOrFail($inviteId);
        $invite->forceFill(['revoked_at' => now()])->save();

        return $this->payload($invite->fresh('inviter'));
    }

    public function accept(string $token, int $providerProfileId, string $email): void
    {
        $invite = $this->validInviteForToken($token);
        if (strtolower(trim($email)) !== strtolower($invite->email)) {
            throw new HttpException(422, 'This provider invite is for a different email address.');
        }

        $invite->forceFill([
            'accepted_at' => now(),
            'created_provider_profile_id' => $providerProfileId,
        ])->save();
    }

    private function validInviteForToken(string $token): ProviderInvite
    {
        $invite = ProviderInvite::where('token_hash', hash('sha256', $token))->first();
        if (!$invite || $invite->revoked_at || $invite->accepted_at || $invite->expires_at->isPast()) {
            throw new HttpException(422, 'This provider invite is invalid or expired.');
        }

        return $invite;
    }

    private function payload(ProviderInvite $invite): array
    {
        return [
            'id' => $invite->id,
            'provider_name' => $invite->provider_name,
            'email' => $invite->email,
            'service_type' => $invite->service_type,
            'personal_message' => $invite->personal_message,
            'status' => $this->status($invite),
            'expires_at' => $invite->expires_at,
            'accepted_at' => $invite->accepted_at,
            'revoked_at' => $invite->revoked_at,
            'created_provider_profile_id' => $invite->created_provider_profile_id,
            'inviter' => $invite->inviter ? [
                'id' => $invite->inviter->id,
                'name' => $invite->inviter->name,
                'email' => $invite->inviter->email,
            ] : null,
            'created_at' => $invite->created_at,
        ];
    }

    private function status(ProviderInvite $invite): string
    {
        if ($invite->revoked_at) return 'revoked';
        if ($invite->accepted_at) return 'accepted';
        if ($invite->expires_at->isPast()) return 'expired';
        return 'pending';
    }

    private function inviteUrl(string $token): string
    {
        return rtrim((string) config('app.frontend_url', config('app.url')), '/') . '/register/provider?invite=' . urlencode($token);
    }

    private function tokenPair(): array
    {
        $token = Str::random(64);
        return [$token, hash('sha256', $token)];
    }

    private function ensureCanManage(User $admin): void
    {
        $this->adminAccess->assertCan($admin, AdminAccessService::MANAGE_PROVIDER_INVITES);
    }
}
