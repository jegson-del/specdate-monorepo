<?php

namespace App\Services;

use App\Models\DateVoucher;
use App\Models\ProviderProfile;
use App\Models\SpecDate;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;

class DateVoucherService
{
    public function __construct(private NotificationService $notificationService)
    {
    }

    public function preview(User $user, string $dateCode, int $providerProfileId): array
    {
        $date = $this->findDateForUser($user, $dateCode);
        $provider = ProviderProfile::with(['user:id,name,username', 'categories'])->findOrFail($providerProfileId);

        return [
            'date' => $this->datePayload($date, $user),
            'provider' => $this->providerPayload($provider),
            'voucher_terms' => [
                'discount_percentage' => (int) ($provider->discount_percentage ?? 10),
                'minimum_spend' => $provider->minimum_spend !== null ? (float) $provider->minimum_spend : null,
                'currency' => $provider->currency ?: $this->currencyForCountry($provider->country),
                'booking_required' => (bool) $provider->booking_required,
                'id_required' => (bool) $provider->id_required,
                'initial_status' => $provider->booking_required ? DateVoucher::STATUS_PENDING_PROVIDER : DateVoucher::STATUS_ACTIVE,
            ],
        ];
    }

    public function create(User $user, string $dateCode, int $providerProfileId): DateVoucher
    {
        $date = $this->findDateForUser($user, $dateCode);
        $provider = ProviderProfile::with('user')->findOrFail($providerProfileId);

        $existing = DateVoucher::where('spec_date_id', $date->id)
            ->where('provider_profile_id', $provider->id)
            ->whereIn('status', [DateVoucher::STATUS_PENDING_PROVIDER, DateVoucher::STATUS_ACTIVE])
            ->first();
        if ($existing) {
            throw new HttpException(422, 'You already have an active voucher request for this provider.');
        }

        $voucher = DB::transaction(function () use ($date, $provider, $user) {
            return DateVoucher::create([
                'spec_date_id' => $date->id,
                'provider_profile_id' => $provider->id,
                'owner_id' => $date->owner_id,
                'winner_user_id' => $date->winner_user_id,
                'requested_by_user_id' => $user->id,
                'voucher_code' => $this->generateVoucherCode(),
                'qr_token' => $this->generateQrToken(),
                'discount_percentage' => (int) ($provider->discount_percentage ?? 10),
                'minimum_spend' => $provider->minimum_spend,
                'currency' => $provider->currency ?: $this->currencyForCountry($provider->country),
                'booking_required' => (bool) $provider->booking_required,
                'status' => $provider->booking_required ? DateVoucher::STATUS_PENDING_PROVIDER : DateVoucher::STATUS_ACTIVE,
                'expires_at' => now()->addDays(30),
            ]);
        });

        $this->notifyVoucherCreated($voucher->fresh(['providerProfile.user', 'owner', 'winner']));

        return $voucher->fresh($this->voucherRelations());
    }

    public function listForUser(User $user, int $perPage = 20)
    {
        $vouchers = DateVoucher::query()
            ->where(fn ($q) => $q->where('owner_id', $user->id)->orWhere('winner_user_id', $user->id))
            ->with($this->voucherRelations())
            ->latest()
            ->paginate(max(1, min($perPage, 50)));

        $vouchers->getCollection()->transform(fn (DateVoucher $voucher) => $this->voucherPayload($voucher, $user));

        return $vouchers;
    }

    public function listForProvider(User $providerUser, int $perPage = 20)
    {
        if ($providerUser->role !== 'provider') {
            throw new HttpException(403, 'Provider access required.');
        }

        $providerProfileId = $providerUser->providerProfile?->id;
        if (!$providerProfileId) {
            return DateVoucher::query()->whereRaw('1 = 0')->paginate(max(1, min($perPage, 50)));
        }

        $vouchers = DateVoucher::query()
            ->where('provider_profile_id', $providerProfileId)
            ->with($this->voucherRelations())
            ->latest()
            ->paginate(max(1, min($perPage, 50)));

        $vouchers->getCollection()->transform(fn (DateVoucher $voucher) => $this->voucherPayload($voucher, $providerUser));

        return $vouchers;
    }

    public function getForUser(User $user, int $voucherId): DateVoucher
    {
        $voucher = DateVoucher::with($this->voucherRelations())->findOrFail($voucherId);
        $this->authorizeVoucherAccess($user, $voucher);

        return $voucher;
    }

    public function approve(User $providerUser, int $voucherId): DateVoucher
    {
        $voucher = $this->getProviderVoucher($providerUser, $voucherId);
        if ($voucher->status !== DateVoucher::STATUS_PENDING_PROVIDER) {
            throw new HttpException(422, 'Only pending voucher requests can be approved.');
        }

        $voucher->update([
            'status' => DateVoucher::STATUS_ACTIVE,
            'provider_decision_at' => now(),
            'provider_decision_by' => $providerUser->id,
        ]);

        $this->notifyMatchedUsers($voucher->fresh($this->voucherRelations()), 'voucher_approved', 'Voucher approved', 'Your date voucher has been approved by the provider.');

        return $voucher->fresh($this->voucherRelations());
    }

    public function reject(User $providerUser, int $voucherId): DateVoucher
    {
        $voucher = $this->getProviderVoucher($providerUser, $voucherId);
        if ($voucher->status !== DateVoucher::STATUS_PENDING_PROVIDER) {
            throw new HttpException(422, 'Only pending voucher requests can be rejected.');
        }

        $voucher->update([
            'status' => DateVoucher::STATUS_REJECTED,
            'provider_decision_at' => now(),
            'provider_decision_by' => $providerUser->id,
        ]);

        $this->notifyMatchedUsers($voucher->fresh($this->voucherRelations()), 'voucher_rejected', 'Voucher rejected', 'The provider rejected this date voucher request.');

        return $voucher->fresh($this->voucherRelations());
    }

    public function redeem(User $providerUser, string $code, ?float $totalSpent = null): DateVoucher
    {
        if ($providerUser->role !== 'provider') {
            throw new HttpException(403, 'Provider access required.');
        }

        $voucher = DateVoucher::with($this->voucherRelations())
            ->where('voucher_code', $code)
            ->orWhere('qr_token', $code)
            ->firstOrFail();

        if ((int) $voucher->providerProfile?->user_id !== (int) $providerUser->id) {
            throw new HttpException(403, 'This voucher belongs to another provider.');
        }
        if ($voucher->status === DateVoucher::STATUS_PENDING_PROVIDER) {
            throw new HttpException(422, 'Approve this voucher before redeeming it.');
        }
        if ($voucher->status !== DateVoucher::STATUS_ACTIVE) {
            throw new HttpException(422, 'Only active vouchers can be redeemed.');
        }
        if ($voucher->expires_at && $voucher->expires_at->isPast()) {
            $voucher->update(['status' => DateVoucher::STATUS_EXPIRED]);
            throw new HttpException(422, 'This voucher has expired.');
        }

        DB::transaction(function () use ($voucher, $providerUser, $totalSpent) {
            $voucher->update([
                'status' => DateVoucher::STATUS_REDEEMED,
                'redeemed_at' => now(),
                'redeemed_by_provider_user_id' => $providerUser->id,
                'total_spent' => $totalSpent,
                'spend_recorded_at' => $totalSpent !== null ? now() : null,
            ]);

            $voucher->specDate?->update(['status' => SpecDate::STATUS_COMPLETED]);
        });

        $this->notifyMatchedUsers(
            $voucher->fresh($this->voucherRelations()),
            'voucher_redeemed',
            'Date voucher redeemed',
            'Your provider confirmed that you attended this date. Share a quick review when you can.'
        );

        return $voucher->fresh($this->voucherRelations());
    }

    public function previewScan(User $providerUser, string $code): DateVoucher
    {
        if ($providerUser->role !== 'provider') {
            throw new HttpException(403, 'Provider access required.');
        }

        $voucher = DateVoucher::with($this->voucherRelations())
            ->where('voucher_code', $code)
            ->orWhere('qr_token', $code)
            ->firstOrFail();

        if ((int) $voucher->providerProfile?->user_id !== (int) $providerUser->id) {
            throw new HttpException(403, 'This voucher belongs to another provider.');
        }

        if ($voucher->status === DateVoucher::STATUS_ACTIVE && $voucher->expires_at && $voucher->expires_at->isPast()) {
            $voucher->update(['status' => DateVoucher::STATUS_EXPIRED]);
        }

        return $voucher->fresh($this->voucherRelations());
    }

    public function voucherPayload(DateVoucher $voucher, User $viewer): array
    {
        $voucher->loadMissing($this->voucherRelations());

        return [
            'id' => $voucher->id,
            'spec_date_id' => $voucher->spec_date_id,
            'provider_profile_id' => $voucher->provider_profile_id,
            'owner_id' => $voucher->owner_id,
            'winner_user_id' => $voucher->winner_user_id,
            'requested_by_user_id' => $voucher->requested_by_user_id,
            'voucher_code' => $voucher->voucher_code,
            'qr_token' => $voucher->qr_token,
            'discount_percentage' => (int) $voucher->discount_percentage,
            'minimum_spend' => $voucher->minimum_spend !== null ? (float) $voucher->minimum_spend : null,
            'currency' => $voucher->currency ?: $voucher->providerProfile?->currency ?: $this->currencyForCountry($voucher->providerProfile?->country),
            'booking_required' => (bool) $voucher->booking_required,
            'status' => $voucher->status,
            'expires_at' => $voucher->expires_at,
            'redeemed_at' => $voucher->redeemed_at,
            'total_spent' => $voucher->total_spent !== null ? (float) $voucher->total_spent : null,
            'spend_recorded_at' => $voucher->spend_recorded_at,
            'created_at' => $voucher->created_at,
            'provider' => $this->providerPayload($voucher->providerProfile),
            'date' => $this->datePayload($voucher->specDate, $viewer),
            'owner' => $this->userPayload($voucher->owner),
            'winner' => $this->userPayload($voucher->winner),
        ];
    }

    public function voucherRelations(): array
    {
        return [
            'providerProfile.user:id,name,username',
            'providerProfile.user.media',
            'providerProfile.categories',
            'specDate.spec:id,title,location_city',
            'owner:id,name,username',
            'owner.profile',
            'owner.media',
            'winner:id,name,username',
            'winner.profile',
            'winner.media',
        ];
    }

    private function getProviderVoucher(User $providerUser, int $voucherId): DateVoucher
    {
        if ($providerUser->role !== 'provider') {
            throw new HttpException(403, 'Provider access required.');
        }

        $voucher = DateVoucher::with($this->voucherRelations())->findOrFail($voucherId);
        if ((int) $voucher->providerProfile?->user_id !== (int) $providerUser->id) {
            throw new HttpException(403, 'This voucher belongs to another provider.');
        }

        return $voucher;
    }

    private function findDateForUser(User $user, string $dateCode): SpecDate
    {
        $date = SpecDate::with(['spec:id,title,location_city', 'owner.profile', 'winner.profile'])
            ->where('date_code', strtoupper(trim($dateCode)))
            ->firstOrFail();

        if ((int) $date->owner_id !== (int) $user->id && (int) $date->winner_user_id !== (int) $user->id) {
            throw new HttpException(403, 'This date code does not belong to you.');
        }

        return $date;
    }

    private function authorizeVoucherAccess(User $user, DateVoucher $voucher): void
    {
        if ((int) $voucher->owner_id === (int) $user->id || (int) $voucher->winner_user_id === (int) $user->id) {
            return;
        }
        if ($user->role === 'provider' && (int) $voucher->providerProfile?->user_id === (int) $user->id) {
            return;
        }

        throw new HttpException(403, 'You cannot access this voucher.');
    }

    private function providerPayload(?ProviderProfile $profile): ?array
    {
        if (!$profile) {
            return null;
        }

        $media = $profile->user?->media ?? collect();
        $shareableMedia = $media->whereNull('hidden_at')->filter(fn ($item) => $item->isShareable());
        $avatar = $shareableMedia->where('type', 'avatar')->sortByDesc('id')->first();
        $gallery = $shareableMedia->where('type', 'provider_gallery')->sortByDesc('id')->first();

        return [
            'id' => $profile->id,
            'user_id' => $profile->user_id,
            'name' => $profile->company_name ?: $profile->user?->name ?: 'Provider',
            'category' => $profile->categories?->first()?->name ?? 'Venue',
            'city' => $profile->city,
            'country' => $profile->country,
            'address' => $profile->address,
            'currency' => $profile->currency ?: $this->currencyForCountry($profile->country),
            'imageUrl' => $profile->image ?: $avatar?->url ?: $gallery?->url,
            'discountPercentage' => (int) ($profile->discount_percentage ?? 10),
            'minimumSpend' => $profile->minimum_spend !== null ? (float) $profile->minimum_spend : null,
            'bookingRequired' => (bool) $profile->booking_required,
            'idRequired' => (bool) $profile->id_required,
            'phone' => $profile->phone,
        ];
    }

    private function datePayload(?SpecDate $date, User $viewer): ?array
    {
        if (!$date) {
            return null;
        }

        return [
            'id' => $date->id,
            'date_code' => $date->date_code,
            'date_number' => (int) ($date->date_number ?: 1),
            'date_label' => $this->dateOrdinal((int) ($date->date_number ?: 1)) . ' date',
            'status' => $date->status ?: SpecDate::STATUS_ACTIVE,
            'is_owner' => (int) $date->owner_id === (int) $viewer->id,
            'spec' => $date->spec,
        ];
    }

    private function userPayload(?User $user): ?array
    {
        if (!$user) {
            return null;
        }

        $avatar = $user->media?->where('type', 'avatar')->whereNull('hidden_at')->filter(fn ($media) => $media->isShareable())->sortByDesc('id')->first()?->url;

        return [
            'id' => $user->id,
            'name' => $user->profile?->full_name ?? $user->name,
            'username' => $user->username,
            'avatar' => $avatar,
        ];
    }

    private function notifyVoucherCreated(DateVoucher $voucher): void
    {
        $providerUser = $voucher->providerProfile?->user;
        if ($providerUser) {
            $this->notificationService->notify(
                $providerUser,
                'voucher_created',
                ['voucher_id' => $voucher->id],
                'New date voucher',
                'Matched users selected your venue for a date.'
            );
        }

        $this->notifyMatchedUsers($voucher, 'voucher_created', 'Date voucher created', 'A date voucher has been created for your match.');
    }

    private function notifyMatchedUsers(DateVoucher $voucher, string $type, string $title, string $body): void
    {
        foreach ([$voucher->owner, $voucher->winner] as $recipient) {
            if ($recipient) {
                $this->notificationService->notify($recipient, $type, [
                    'voucher_id' => $voucher->id,
                    'spec_date_id' => $voucher->spec_date_id,
                    'provider_profile_id' => $voucher->provider_profile_id,
                    'review_prompt' => $type === 'voucher_redeemed',
                ], $title, $body);
            }
        }
    }

    private function generateVoucherCode(): string
    {
        do {
            $code = 'DU-' . strtoupper(Str::random(8));
        } while (DateVoucher::where('voucher_code', $code)->exists());

        return $code;
    }

    private function generateQrToken(): string
    {
        do {
            $token = Str::random(48);
        } while (DateVoucher::where('qr_token', $token)->exists());

        return $token;
    }

    private function dateOrdinal(int $number): string
    {
        if ($number === 1) return 'First';
        if ($number === 2) return 'Second';
        if ($number === 3) return 'Third';
        return "{$number}th";
    }

    private function currencyForCountry(?string $country): string
    {
        $country = strtolower(trim((string) $country));

        return [
            'united kingdom' => 'GBP',
            'uk' => 'GBP',
            'great britain' => 'GBP',
            'england' => 'GBP',
            'scotland' => 'GBP',
            'wales' => 'GBP',
            'northern ireland' => 'GBP',
            'united states' => 'USD',
            'usa' => 'USD',
            'us' => 'USD',
            'canada' => 'CAD',
            'nigeria' => 'NGN',
            'ghana' => 'GHS',
            'kenya' => 'KES',
            'south africa' => 'ZAR',
            'france' => 'EUR',
            'germany' => 'EUR',
            'spain' => 'EUR',
            'italy' => 'EUR',
            'ireland' => 'EUR',
            'netherlands' => 'EUR',
            'belgium' => 'EUR',
            'portugal' => 'EUR',
            'australia' => 'AUD',
            'new zealand' => 'NZD',
            'india' => 'INR',
            'united arab emirates' => 'AED',
            'uae' => 'AED',
        ][$country] ?? 'USD';
    }
}
