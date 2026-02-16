<?php

namespace App\Http\Controllers;

use App\Models\Discount;
use App\Models\ProviderCategory;
use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ProviderController extends Controller
{
    /**
     * Get provider dashboard data.
     */
    public function getDashboard()
    {
        /** @var User $user */
        $user = Auth::user();

        if ($user->role !== 'provider') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $profile = $user->providerProfile()->with('categories')->first();
        
        if (!$profile) {
            // Auto-create profile if missing
            $profile = ProviderProfile::create([
                'user_id' => $user->id,
                'discount_percentage' => 10,
            ]);
        }

        $discounts = Discount::where('provider_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $stats = [
            'total_discounts' => $discounts->count(),
            'used_discounts' => $discounts->where('status', 'used')->count(),
        ];

        return response()->json([
            'profile' => $profile,
            'discounts' => $discounts,
            'stats' => $stats,
        ]);
    }

    /**
     * Update provider settings.
     */
    public function updateSettings(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();

        if ($user->role !== 'provider') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'image' => 'nullable|string',
            'company_name' => 'nullable|string',
            'description' => 'nullable|string',
            'website' => 'nullable|string',
            'phone' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'country' => 'nullable|string',
            'discount_percentage' => 'required|integer|min:10|max:50',
            'categories' => 'nullable|array',
            'categories.*' => 'exists:provider_categories,id',
        ]);

        $profile = $user->providerProfile;

        if (!$profile) {
            $profile = new ProviderProfile(['user_id' => $user->id]);
        }

        $profile->fill($request->only([
            'image',
            'company_name',
            'description',
            'website',
            'phone',
            'address',
            'city',
            'country',
            'discount_percentage',
        ]));
        $profile->save();

        if ($request->has('categories')) {
            $profile->categories()->sync($request->categories);
        }

        return response()->json([
            'message' => 'Settings updated',
            'profile' => $profile->load('categories'),
        ]);
    }

    /**
     * Scan and redeem a discount QR code.
     */
    public function scanQRCode(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();

        if ($user->role !== 'provider') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'code' => 'required|string|exists:discounts,code',
        ]);

        $discount = Discount::where('code', $request->code)->first();

        if ($discount->provider_id !== $user->id) {
            return response()->json(['message' => 'This discount belongs to another provider'], 403);
        }

        if ($discount->status === 'used') {
            return response()->json([
                'message' => 'This discount has already been used',
                'discount' => $discount
            ], 409);
        }

        $discount->update([
            'status' => 'used',
            'used_at' => now(),
        ]);

        return response()->json([
            'message' => 'Discount redeemed successfully',
            'discount' => $discount,
        ]);
    }
    
    /**
     * Get all provider categories.
     */
    public function getCategories()
    {
        return response()->json(ProviderCategory::all());
    }
}
