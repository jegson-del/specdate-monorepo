<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CreditProduct;
use App\Models\UserBalance;
use App\Models\UserTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class CreditsController extends Controller
{
    /**
     * List credit products (product_id, quantity, name). Matches RevenueCat; app uses product_id when purchasing.
     */
    public function products(): JsonResponse
    {
        $list = CreditProduct::orderBy('sort_order')->get(['id', 'product_id', 'quantity', 'name']);
        return response()->json(['data' => $list]);
    }

    /**
     * Grant credits after a RevenueCat purchase.
     * We get product_id from RevenueCat/app, look up credit_products to get quantity, then apply.
     * Idempotent: same revenue_cat_transaction_id won't grant twice.
     *
     * Body: product_id (required, must exist in credit_products), revenue_cat_transaction_id (required),
     *       platform, currency, amount (optional).
     */
    public function grant(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|string|max:64',
            'revenue_cat_transaction_id' => 'required|string|max:255',
            'platform' => 'nullable|string|max:32',
            'currency' => 'nullable|string|size:3',  // From RevenueCat, ISO 4217 (e.g. USD, GBP, EUR)
            'amount' => 'nullable|numeric|min:0',   // Price paid from RevenueCat for tracking
            'store' => 'nullable|string|max:64',
            'store_transaction_id' => 'nullable|string|max:255',
            'revenue_cat_app_user_id' => 'nullable|string|max:255',
            'environment' => 'nullable|string|max:32',
            'is_sandbox' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $txId = $validated['revenue_cat_transaction_id'];
        $productId = $validated['product_id'];

        // Get quantity from credit_products table (must match RevenueCat product_id)
        $product = CreditProduct::where('product_id', $productId)->first();
        if (!$product || $product->quantity < 1) {
            throw new HttpException(422, 'Unknown or invalid product_id. product_id must exist in credit_products and match RevenueCat.');
        }
        $quantity = $product->quantity;

        // Idempotency: a RevenueCat/store transaction can only fund one backend user.
        $existing = UserTransaction::whereNotNull('revenue_cat_transaction_id')
            ->where('type', 'CREDIT')
            ->where('revenue_cat_transaction_id', $txId)
            ->first();

        if ($existing && (int) $existing->user_id !== (int) $user->id) {
            throw new HttpException(409, 'This purchase transaction has already been used by another account.');
        }

        if ($existing) {
            $balance = $user->balance;
            return response()->json([
                'message' => 'Credits already granted for this purchase.',
                'credits' => $balance ? $balance->credits : 0,
            ], 200);
        }

        $balance = $user->balance ?: UserBalance::create(['user_id' => $user->id, 'credits' => 0]);

        DB::transaction(function () use ($user, $balance, $quantity, $productId, $validated, $txId) {
            $balance->increment('credits', $quantity);
            $user->transactions()->create([
                'type' => 'CREDIT',
                'item_type' => $productId,
                'quantity' => $quantity,
                'amount' => $validated['amount'] ?? null,
                'currency' => $validated['currency'] ?? null,
                'purpose' => 'Purchased (RevenueCat)',
                'revenue_cat_transaction_id' => $txId,
                'metadata' => array_filter([
                    'product_id' => $productId,
                    'platform' => $validated['platform'] ?? null,
                    'store' => $validated['store'] ?? null,
                    'store_transaction_id' => $validated['store_transaction_id'] ?? null,
                    'revenue_cat_app_user_id' => $validated['revenue_cat_app_user_id'] ?? null,
                    'environment' => $validated['environment'] ?? null,
                    'is_sandbox' => Arr::exists($validated, 'is_sandbox') ? (bool) $validated['is_sandbox'] : null,
                ], fn ($value) => $value !== null),
            ]);
        });

        $balance->refresh();

        return response()->json([
            'message' => 'Credits added.',
            'credits' => $balance->credits,
        ], 200);
    }

    /**
     * List recent credit transactions. CREDIT rows have item_type = product_id; DEBIT rows have item_type = 'credit'.
     */
    public function transactions(Request $request): JsonResponse
    {
        $list = $request->user()
            ->transactions()
            ->where(function ($q) {
                $q->where('type', 'CREDIT')
                    ->orWhere(function ($q2) {
                        $q2->where('type', 'DEBIT')->where('item_type', 'credit');
                    });
            })
            ->orderByDesc('created_at')
            ->paginate((int) $request->integer('per_page', 30), ['id', 'type', 'item_type', 'quantity', 'amount', 'currency', 'purpose', 'revenue_cat_transaction_id', 'metadata', 'created_at']);

        return response()->json(['data' => $list]);
    }
}
