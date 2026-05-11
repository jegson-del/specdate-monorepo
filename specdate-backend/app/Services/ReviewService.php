<?php

namespace App\Services;

use App\Models\DatePartnerReview;
use App\Models\DateVoucher;
use App\Models\ProviderReview;
use App\Models\ReviewPromptDismissal;
use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ReviewService
{
    public function promptContext(User $user, int $voucherId): array
    {
        $voucher = $this->reviewableVoucher($user, $voucherId);

        return $this->contextPayload($voucher, $user);
    }

    public function pendingPrompts(User $user)
    {
        return DateVoucher::query()
            ->where('status', DateVoucher::STATUS_REDEEMED)
            ->where(fn ($q) => $q->where('owner_id', $user->id)->orWhere('winner_user_id', $user->id))
            ->where(function ($query) use ($user) {
                $query
                    ->whereDoesntHave('providerReviews', fn ($q) => $q->where('reviewer_id', $user->id))
                    ->orWhereDoesntHave('datePartnerReviews', fn ($q) => $q->where('reviewer_id', $user->id));
            })
            ->whereNotExists(function ($query) use ($user) {
                $query->selectRaw('1')
                    ->from('review_prompt_dismissals')
                    ->whereColumn('date_voucher_id', 'date_vouchers.id')
                    ->where('user_id', $user->id);
            })
            ->with($this->relations())
            ->latest('redeemed_at')
            ->limit(10)
            ->get()
            ->map(fn (DateVoucher $voucher) => $this->contextPayload($voucher, $user));
    }

    public function submitProviderReview(User $user, int $voucherId, array $data): ProviderReview
    {
        $voucher = $this->reviewableVoucher($user, $voucherId);

        return ProviderReview::updateOrCreate(
            [
                'date_voucher_id' => $voucher->id,
                'reviewer_id' => $user->id,
            ],
            [
                'provider_profile_id' => $voucher->provider_profile_id,
                'rating' => (int) $data['rating'],
                'comment' => $data['comment'] ?? null,
            ]
        );
    }

    public function submitPartnerReview(User $user, int $voucherId, array $data): DatePartnerReview
    {
        $voucher = $this->reviewableVoucher($user, $voucherId);
        $partnerId = $this->partnerId($voucher, $user);

        return DatePartnerReview::updateOrCreate(
            [
                'date_voucher_id' => $voucher->id,
                'reviewer_id' => $user->id,
                'reviewed_user_id' => $partnerId,
            ],
            [
                'spec_date_id' => $voucher->spec_date_id,
                'rating' => (int) $data['rating'],
                'chemistry_rating' => isset($data['chemistry_rating']) ? (int) $data['chemistry_rating'] : null,
                'safety_rating' => isset($data['safety_rating']) ? (int) $data['safety_rating'] : null,
                'would_meet_again' => $data['would_meet_again'] ?? null,
                'comment' => $data['comment'] ?? null,
            ]
        );
    }

    public function dismissPrompt(User $user, int $voucherId): ReviewPromptDismissal
    {
        $voucher = $this->reviewableVoucher($user, $voucherId);

        return ReviewPromptDismissal::updateOrCreate(
            [
                'date_voucher_id' => $voucher->id,
                'user_id' => $user->id,
            ],
            ['dismissed_at' => now()]
        );
    }

    private function reviewableVoucher(User $user, int $voucherId): DateVoucher
    {
        $voucher = DateVoucher::with($this->relations())->findOrFail($voucherId);

        if ((int) $voucher->owner_id !== (int) $user->id && (int) $voucher->winner_user_id !== (int) $user->id) {
            throw new HttpException(403, 'You cannot review this date.');
        }

        if ($voucher->status !== DateVoucher::STATUS_REDEEMED) {
            throw new HttpException(422, 'Reviews open after the voucher is redeemed.');
        }

        return $voucher;
    }

    private function contextPayload(DateVoucher $voucher, User $user): array
    {
        $providerReview = $voucher->providerReviews->firstWhere('reviewer_id', $user->id);
        $partnerReview = $voucher->datePartnerReviews->firstWhere('reviewer_id', $user->id);
        $dismissal = ReviewPromptDismissal::where('date_voucher_id', $voucher->id)->where('user_id', $user->id)->first();
        $partner = (int) $voucher->owner_id === (int) $user->id ? $voucher->winner : $voucher->owner;

        return [
            'voucher' => [
                'id' => $voucher->id,
                'voucher_code' => $voucher->voucher_code,
                'discount_percentage' => (int) $voucher->discount_percentage,
                'total_spent' => $voucher->total_spent !== null ? (float) $voucher->total_spent : null,
                'currency' => $voucher->currency ?: $voucher->providerProfile?->currency,
                'redeemed_at' => $voucher->redeemed_at,
                'date_code' => $voucher->specDate?->date_code,
                'spec' => $voucher->specDate?->spec,
            ],
            'provider' => [
                'id' => $voucher->providerProfile?->id,
                'name' => $voucher->providerProfile?->company_name ?: $voucher->providerProfile?->user?->name ?: 'Provider',
                'city' => $voucher->providerProfile?->city,
                'category' => $voucher->providerProfile?->categories?->first()?->name ?? 'Venue',
            ],
            'partner' => $partner ? [
                'id' => $partner->id,
                'name' => $partner->profile?->full_name ?? $partner->name,
                'username' => $partner->username,
            ] : null,
            'reviews' => [
                'provider' => $providerReview,
                'partner' => $partnerReview,
                'dismissed_at' => $dismissal?->dismissed_at,
                'is_complete' => $providerReview !== null && $partnerReview !== null,
            ],
        ];
    }

    private function partnerId(DateVoucher $voucher, User $user): int
    {
        return (int) $voucher->owner_id === (int) $user->id
            ? (int) $voucher->winner_user_id
            : (int) $voucher->owner_id;
    }

    private function relations(): array
    {
        return [
            'providerProfile.user:id,name,username',
            'providerProfile.categories',
            'specDate.spec:id,title,location_city',
            'owner:id,name,username',
            'owner.profile',
            'winner:id,name,username',
            'winner.profile',
            'providerReviews',
            'datePartnerReviews',
        ];
    }
}
