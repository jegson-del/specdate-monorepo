<?php

namespace App\Http\Controllers;

use App\Services\ReviewService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ReviewController extends Controller
{
    use ApiResponse;

    public function __construct(private ReviewService $reviewService)
    {
    }

    public function pending(Request $request)
    {
        return $this->sendResponse($this->reviewService->pendingPrompts($request->user()), 'Review prompts retrieved successfully.');
    }

    public function context(Request $request, int $voucher)
    {
        try {
            return $this->sendResponse($this->reviewService->promptContext($request->user(), $voucher), 'Review context retrieved successfully.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function provider(Request $request, int $voucher)
    {
        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:2000',
        ]);

        try {
            return $this->sendResponse($this->reviewService->submitProviderReview($request->user(), $voucher, $data), 'Provider review saved.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function partner(Request $request, int $voucher)
    {
        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'chemistry_rating' => 'nullable|integer|min:1|max:5',
            'safety_rating' => 'nullable|integer|min:1|max:5',
            'would_meet_again' => 'nullable|boolean',
            'comment' => 'nullable|string|max:2000',
        ]);

        try {
            return $this->sendResponse($this->reviewService->submitPartnerReview($request->user(), $voucher, $data), 'Date review saved.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }

    public function dismiss(Request $request, int $voucher)
    {
        try {
            return $this->sendResponse($this->reviewService->dismissPrompt($request->user(), $voucher), 'Review prompt dismissed.');
        } catch (HttpException $e) {
            return $this->sendError($e->getMessage(), [], $e->getStatusCode());
        }
    }
}
