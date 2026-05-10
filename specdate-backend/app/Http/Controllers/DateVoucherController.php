<?php

namespace App\Http\Controllers;

use App\Services\DateVoucherService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class DateVoucherController extends Controller
{
    use ApiResponse;

    public function __construct(private DateVoucherService $dateVoucherService)
    {
    }

    public function preview(Request $request)
    {
        $data = $request->validate([
            'date_code' => 'required|string',
            'provider_profile_id' => 'required|exists:provider_profiles,id',
        ]);

        try {
            return $this->sendResponse(
                $this->dateVoucherService->preview($request->user(), $data['date_code'], (int) $data['provider_profile_id']),
                'Voucher preview retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'date_code' => 'required|string',
            'provider_profile_id' => 'required|exists:provider_profiles,id',
        ]);

        try {
            $voucher = $this->dateVoucherService->create($request->user(), $data['date_code'], (int) $data['provider_profile_id']);
            return $this->sendResponse($this->dateVoucherService->voucherPayload($voucher, $request->user()), 'Voucher created successfully.', 201);
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function index(Request $request)
    {
        return $this->sendResponse(
            $this->dateVoucherService->listForUser($request->user(), (int) $request->integer('per_page', 20)),
            'Vouchers retrieved successfully.'
        );
    }

    public function show(Request $request, int $voucher)
    {
        try {
            $dateVoucher = $this->dateVoucherService->getForUser($request->user(), $voucher);
            return $this->sendResponse($this->dateVoucherService->voucherPayload($dateVoucher, $request->user()), 'Voucher retrieved successfully.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function providerBookings(Request $request)
    {
        try {
            return $this->sendResponse(
                $this->dateVoucherService->listForProvider($request->user(), (int) $request->integer('per_page', 20)),
                'Provider bookings retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function scanPreview(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string',
        ]);

        try {
            $voucher = $this->dateVoucherService->previewScan($request->user(), trim((string) $data['code']));
            return $this->sendResponse(
                $this->dateVoucherService->voucherPayload($voucher, $request->user()),
                'Voucher scan preview retrieved successfully.'
            );
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function approve(Request $request, int $voucher)
    {
        try {
            $dateVoucher = $this->dateVoucherService->approve($request->user(), $voucher);
            return $this->sendResponse($this->dateVoucherService->voucherPayload($dateVoucher, $request->user()), 'Voucher approved.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function reject(Request $request, int $voucher)
    {
        try {
            $dateVoucher = $this->dateVoucherService->reject($request->user(), $voucher);
            return $this->sendResponse($this->dateVoucherService->voucherPayload($dateVoucher, $request->user()), 'Voucher rejected.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
