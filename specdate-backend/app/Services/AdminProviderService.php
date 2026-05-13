<?php

namespace App\Services;

use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminProviderService
{
    public function __construct(
        private EmailService $emailService
    ) {
    }

    public function show(User $admin, int $providerId): array
    {
        $this->ensureAdmin($admin);

        return $this->providerPayload($this->providerQuery()->findOrFail($providerId));
    }

    public function approve(User $admin, int $providerId): array
    {
        $this->ensureAdmin($admin);

        $profile = $this->providerQuery()->findOrFail($providerId);

        $user = DB::transaction(function () use ($admin, $profile) {
            $profile->forceFill([
                'is_verified' => true,
                'approved_at' => $profile->approved_at ?? now(),
                'rejected_at' => null,
                'rejection_reason' => null,
                'reviewed_by' => $admin->id,
            ])->save();

            $profile->user->forceFill([
                'email_verified_at' => $profile->user->email_verified_at ?? now(),
            ])->save();

            return $profile->user->fresh('providerProfile.categories');
        });

        $setupEmailSent = $this->sendSetupEmail($user);

        return array_merge(
            $this->providerPayload($profile->fresh(['user', 'categories', 'reviewer'])),
            ['setup_email_sent' => $setupEmailSent],
        );
    }

    public function reject(User $admin, int $providerId, array $data): array
    {
        $this->ensureAdmin($admin);

        $profile = $this->providerQuery()->findOrFail($providerId);

        if ($profile->is_verified) {
            throw new HttpException(422, 'Approved providers cannot be rejected.');
        }

        $profile->forceFill([
            'is_verified' => false,
            'approved_at' => null,
            'rejected_at' => now(),
            'rejection_reason' => trim((string) $data['reason']),
            'admin_note' => isset($data['admin_note']) ? trim((string) $data['admin_note']) : $profile->admin_note,
            'reviewed_by' => $admin->id,
        ])->save();

        return $this->providerPayload($profile->fresh(['user', 'categories', 'reviewer']));
    }

    public function updateNote(User $admin, int $providerId, ?string $note): array
    {
        $this->ensureAdmin($admin);

        $profile = $this->providerQuery()->findOrFail($providerId);
        $profile->forceFill([
            'admin_note' => trim((string) $note) ?: null,
            'reviewed_by' => $admin->id,
        ])->save();

        return $this->providerPayload($profile->fresh(['user', 'categories', 'reviewer']));
    }

    public function resendSetupEmail(User $admin, int $providerId): bool
    {
        $this->ensureAdmin($admin);

        $profile = $this->providerQuery()->findOrFail($providerId);
        if (!$profile->is_verified) {
            throw new HttpException(422, 'Only approved providers can receive setup email.');
        }

        return $this->sendSetupEmail($profile->user);
    }

    public function providerPayload(ProviderProfile $profile): array
    {
        return [
            'id' => $profile->id,
            'business_name' => $profile->company_name ?: $profile->user?->name,
            'email' => $profile->user?->email,
            'phone' => $profile->phone ?: $profile->user?->mobile,
            'category' => $profile->categories->first()?->name ?? 'Uncategorized',
            'city' => $profile->city,
            'country' => $profile->country,
            'postcode' => $profile->postcode,
            'address' => $profile->address,
            'notes' => $profile->description,
            'admin_note' => $profile->admin_note,
            'rejection_reason' => $profile->rejection_reason,
            'status' => $this->statusFor($profile),
            'is_verified' => $profile->is_verified,
            'approved_at' => $profile->approved_at,
            'rejected_at' => $profile->rejected_at,
            'reviewed_by' => $profile->reviewer ? [
                'id' => $profile->reviewer->id,
                'name' => $profile->reviewer->name,
                'email' => $profile->reviewer->email,
            ] : null,
            'created_at' => $profile->created_at,
        ];
    }

    private function providerQuery()
    {
        return ProviderProfile::query()
            ->with(['user:id,name,email,mobile,role,created_at,email_verified_at', 'categories:id,name,slug', 'reviewer:id,name,email'])
            ->whereHas('user', fn ($q) => $q->where('role', 'provider'));
    }

    private function ensureAdmin(?User $user): void
    {
        if (!$user || $user->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }
    }

    private function statusFor(ProviderProfile $profile): string
    {
        if ($profile->is_verified) {
            return 'approved';
        }

        return $profile->rejected_at ? 'rejected' : 'pending';
    }

    private function sendSetupEmail(User $user): bool
    {
        $token = Password::broker()->createToken($user);
        $setupUrl = $this->providerPasswordSetupUrl($user->email, $token);

        return $this->emailService->sendProviderApproved($user, $setupUrl);
    }

    private function providerPasswordSetupUrl(string $email, string $token): string
    {
        $baseUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        return $baseUrl . '/provider/setup-password?' . http_build_query([
            'email' => $email,
            'token' => $token,
        ]);
    }
}
