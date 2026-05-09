<?php

namespace App\Http\Controllers;

use App\Models\ProviderCategory;
use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
                'booking_required' => false,
            ]);
        }

        $media = $user->media()->whereIn('type', ['avatar', 'provider_gallery'])->get();
        $avatar = $media->where('type', 'avatar')->last(); // Get latest avatar
        $gallery = $media->where('type', 'provider_gallery')->values();

        // If media avatar exists, use it as the profile image source of truth
        if ($avatar) {
            $profile->image = $avatar->url;
        }

        return response()->json([
            'profile' => $profile,
            'gallery' => $gallery,
            'counts' => [
                'unread_notifications' => $user->notifications()->whereNull('read_at')->count(),
                'unread_messages' => 0,
                'pending_bookings' => 0,
            ],
            'upcoming_bookings' => [],
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
            'minimum_spend' => 'nullable|numeric|min:0|max:99999999.99',
            'booking_required' => 'nullable|boolean',
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
            'minimum_spend',
            'booking_required',
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

        return response()->json([
            'message' => 'Voucher scanning will be available after date vouchers are enabled.',
        ], 501);
    }
    
    /**
     * Get all provider categories.
     */
    public function getCategories()
    {
        return response()->json(ProviderCategory::all());
    }
}
