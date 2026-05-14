<?php

namespace App\Services;

use App\Models\DateVoucher;
use App\Models\User;
use App\Models\UserTransaction;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminFinancialsService
{
    public function __construct(private AdminAccessService $adminAccess)
    {
    }

    public function vouchers(User $admin, array $filters): array
    {
        $this->ensureAdmin($admin);
        $this->adminAccess->assertCan($admin, AdminAccessService::FINANCIAL_VOUCHERS);

        $perPage = max(1, min((int) ($filters['per_page'] ?? 25), 100));
        $dateField = $filters['date_field'] ?? 'created_at';
        $range = $this->dateRange($filters);

        $query = DateVoucher::query()
            ->with([
                'providerProfile.user:id,name,username,email',
                'providerProfile.categories',
                'owner:id,name,username,email',
                'owner.profile',
                'winner:id,name,username,email',
                'winner.profile',
                'requestedBy:id,name,username,email',
                'redeemedByProvider:id,name,username,email',
                'specDate.spec:id,title,location_city',
            ])
            ->when($filters['provider_id'] ?? null, fn (Builder $query, int $providerId) => $query->where('provider_profile_id', $providerId))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['currency'] ?? null, fn (Builder $query, string $currency) => $query->where('currency', strtoupper($currency)))
            ->when($range, fn (Builder $query, array $range) => $query->whereBetween($dateField, $range));

        $summary = $this->voucherSummary(clone $query);
        $vouchers = $query
            ->latest($dateField)
            ->latest('id')
            ->paginate($perPage);

        $vouchers->getCollection()->transform(fn (DateVoucher $voucher) => $this->voucherPayload($voucher));

        return [
            'summary' => $summary,
            'vouchers' => $vouchers,
            'filters' => [
                'date_field' => $dateField,
                'from' => $range ? $range[0]->toDateTimeString() : null,
                'to' => $range ? $range[1]->toDateTimeString() : null,
            ],
        ];
    }

    public function credits(User $admin, array $filters): array
    {
        $this->ensureAdmin($admin);
        $this->adminAccess->assertCan($admin, AdminAccessService::FINANCIAL_CREDITS);

        $perPage = max(1, min((int) ($filters['per_page'] ?? 25), 100));
        $range = $this->dateRange($filters);

        $query = UserTransaction::query()
            ->with('user:id,name,username,email,role')
            ->when($filters['user_id'] ?? null, fn (Builder $query, int $userId) => $query->where('user_id', $userId))
            ->when($filters['type'] ?? null, fn (Builder $query, string $type) => $query->where('type', $type))
            ->when($filters['item_type'] ?? null, fn (Builder $query, string $itemType) => $query->where('item_type', $itemType))
            ->when($filters['currency'] ?? null, fn (Builder $query, string $currency) => $query->where('currency', strtoupper($currency)))
            ->when($range, fn (Builder $query, array $range) => $query->whereBetween('created_at', $range));

        $summary = $this->creditSummary(clone $query);
        $transactions = $query
            ->latest('created_at')
            ->latest('id')
            ->paginate($perPage);

        $transactions->getCollection()->transform(fn (UserTransaction $transaction) => $this->creditPayload($transaction));

        return [
            'summary' => $summary,
            'transactions' => $transactions,
            'filters' => [
                'from' => $range ? $range[0]->toDateTimeString() : null,
                'to' => $range ? $range[1]->toDateTimeString() : null,
            ],
        ];
    }

    private function voucherSummary(Builder $query): array
    {
        $statusCounts = (clone $query)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $spendByCurrency = (clone $query)
            ->whereNotNull('total_spent')
            ->selectRaw("COALESCE(currency, 'USD') as currency, COUNT(*) as voucher_count, SUM(total_spent) as total_spent, AVG(total_spent) as average_spent")
            ->groupByRaw("COALESCE(currency, 'USD')")
            ->get()
            ->map(fn ($row) => [
                'currency' => $row->currency,
                'voucher_count' => (int) $row->voucher_count,
                'total_spent' => (float) $row->total_spent,
                'average_spent' => round((float) $row->average_spent, 2),
            ])
            ->values()
            ->all();

        return [
            'total_vouchers' => (clone $query)->count(),
            'pending_provider' => (int) ($statusCounts[DateVoucher::STATUS_PENDING_PROVIDER] ?? 0),
            'active' => (int) ($statusCounts[DateVoucher::STATUS_ACTIVE] ?? 0),
            'redeemed' => (int) ($statusCounts[DateVoucher::STATUS_REDEEMED] ?? 0),
            'completed' => (int) ($statusCounts[DateVoucher::STATUS_COMPLETED] ?? 0),
            'rejected' => (int) ($statusCounts[DateVoucher::STATUS_REJECTED] ?? 0),
            'cancelled' => (int) ($statusCounts[DateVoucher::STATUS_CANCELLED] ?? 0),
            'expired' => (int) ($statusCounts[DateVoucher::STATUS_EXPIRED] ?? 0),
            'spend_by_currency' => $spendByCurrency,
        ];
    }

    private function creditSummary(Builder $query): array
    {
        $creditQuantity = (int) (clone $query)->where('type', 'CREDIT')->sum('quantity');
        $debitQuantity = (int) (clone $query)->where('type', 'DEBIT')->sum('quantity');
        $transactionsByType = (clone $query)
            ->selectRaw('type, COUNT(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');
        $purchaseAmountByCurrency = (clone $query)
            ->where('type', 'CREDIT')
            ->whereNotNull('amount')
            ->selectRaw("COALESCE(currency, 'USD') as currency, COUNT(*) as transaction_count, SUM(amount) as total_amount")
            ->groupByRaw("COALESCE(currency, 'USD')")
            ->get()
            ->map(fn ($row) => [
                'currency' => $row->currency,
                'transaction_count' => (int) $row->transaction_count,
                'total_amount' => (float) $row->total_amount,
            ])
            ->values()
            ->all();

        return [
            'total_transactions' => (clone $query)->count(),
            'credit_transactions' => (int) ($transactionsByType['CREDIT'] ?? 0),
            'debit_transactions' => (int) ($transactionsByType['DEBIT'] ?? 0),
            'credits_purchased_or_granted' => $creditQuantity,
            'credits_spent' => $debitQuantity,
            'net_credit_movement' => $creditQuantity - $debitQuantity,
            'purchase_amount_by_currency' => $purchaseAmountByCurrency,
        ];
    }

    private function voucherPayload(DateVoucher $voucher): array
    {
        $provider = $voucher->providerProfile;

        return [
            'id' => $voucher->id,
            'voucher_code' => $voucher->voucher_code,
            'date_code' => $voucher->specDate?->date_code,
            'spec_date_id' => $voucher->spec_date_id,
            'spec' => $voucher->specDate?->spec ? [
                'id' => $voucher->specDate->spec->id,
                'title' => $voucher->specDate->spec->title,
                'location_city' => $voucher->specDate->spec->location_city,
            ] : null,
            'provider' => $provider ? [
                'id' => $provider->id,
                'user_id' => $provider->user_id,
                'name' => $provider->company_name ?: $provider->user?->name,
                'email' => $provider->user?->email,
                'city' => $provider->city,
                'country' => $provider->country,
                'category' => $provider->categories?->first()?->name,
            ] : null,
            'daters' => [
                'owner' => $this->userPayload($voucher->owner),
                'winner' => $this->userPayload($voucher->winner),
            ],
            'requested_by' => $this->userPayload($voucher->requestedBy),
            'status' => $voucher->status,
            'discount_percentage' => (int) $voucher->discount_percentage,
            'minimum_spend' => $voucher->minimum_spend !== null ? (float) $voucher->minimum_spend : null,
            'total_spent' => $voucher->total_spent !== null ? (float) $voucher->total_spent : null,
            'currency' => $voucher->currency ?: $provider?->currency ?: 'USD',
            'created_at' => $voucher->created_at,
            'provider_decision_at' => $voucher->provider_decision_at,
            'redeemed_at' => $voucher->redeemed_at,
            'spend_recorded_at' => $voucher->spend_recorded_at,
            'redeemed_by_provider' => $this->userPayload($voucher->redeemedByProvider),
        ];
    }

    private function creditPayload(UserTransaction $transaction): array
    {
        return [
            'id' => $transaction->id,
            'user' => $this->userPayload($transaction->user),
            'type' => $transaction->type,
            'item_type' => $transaction->item_type,
            'quantity' => (int) $transaction->quantity,
            'amount' => $transaction->amount !== null ? (float) $transaction->amount : null,
            'currency' => $transaction->currency,
            'purpose' => $transaction->purpose,
            'revenue_cat_transaction_id' => $transaction->revenue_cat_transaction_id,
            'metadata' => $transaction->metadata,
            'created_at' => $transaction->created_at,
        ];
    }

    private function userPayload(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->profile?->full_name ?? $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}|null
     */
    private function dateRange(array $filters): ?array
    {
        if (! empty($filters['from']) || ! empty($filters['to'])) {
            $from = Carbon::parse($filters['from'] ?? $filters['to'])->startOfDay();
            $to = Carbon::parse($filters['to'] ?? $filters['from'])->endOfDay();

            return [$from, $to];
        }

        $period = $filters['period'] ?? null;
        if (! $period) {
            return null;
        }

        if ($period === 'day') {
            $date = Carbon::parse($filters['date'] ?? now());

            return [$date->copy()->startOfDay(), $date->copy()->endOfDay()];
        }

        if ($period === 'week') {
            $date = Carbon::parse($filters['date'] ?? now());

            return [$date->copy()->startOfWeek(), $date->copy()->endOfWeek()];
        }

        $date = ! empty($filters['month'])
            ? Carbon::createFromFormat('Y-m-d', $filters['month'].'-01')
            : Carbon::parse($filters['date'] ?? now());

        return [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()];
    }

    private function ensureAdmin(?User $user): void
    {
        if (! $user || $user->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }
    }
}
