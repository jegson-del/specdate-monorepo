<?php

namespace App\Http\Controllers;

use App\Models\DateVoucher;
use App\Services\AdminFinancialsService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminFinancialsController extends Controller
{
    use ApiResponse;

    public function __construct(private AdminFinancialsService $financials)
    {
    }

    public function vouchers(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider_id' => 'nullable|integer|exists:provider_profiles,id',
            'status' => ['nullable', 'string', Rule::in([
                DateVoucher::STATUS_PENDING_PROVIDER,
                DateVoucher::STATUS_ACTIVE,
                DateVoucher::STATUS_REJECTED,
                DateVoucher::STATUS_REDEEMED,
                DateVoucher::STATUS_CANCELLED,
                DateVoucher::STATUS_COMPLETED,
                DateVoucher::STATUS_EXPIRED,
            ])],
            'currency' => 'nullable|string|size:3',
            'period' => ['nullable', 'string', Rule::in(['day', 'week', 'month'])],
            'date' => 'nullable|date',
            'month' => 'nullable|date_format:Y-m',
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
            'date_field' => ['nullable', 'string', Rule::in(['created_at', 'provider_decision_at', 'redeemed_at', 'spend_recorded_at'])],
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            return $this->sendResponse(
                $this->financials->vouchers($request->user(), $data),
                'Voucher financials retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function credits(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
            'type' => ['nullable', 'string', Rule::in(['CREDIT', 'DEBIT'])],
            'item_type' => 'nullable|string|max:120',
            'currency' => 'nullable|string|size:3',
            'period' => ['nullable', 'string', Rule::in(['day', 'week', 'month'])],
            'date' => 'nullable|date',
            'month' => 'nullable|date_format:Y-m',
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        try {
            return $this->sendResponse(
                $this->financials->credits($request->user(), $data),
                'Credit financials retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
