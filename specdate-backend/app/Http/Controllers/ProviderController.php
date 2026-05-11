<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\DateVoucher;
use App\Models\ProviderCategory;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Services\DateVoucherService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ProviderController extends Controller
{
    public function __construct(private DateVoucherService $dateVoucherService)
    {
    }

    /**
     * List public provider profiles for daters.
     */
    public function index(Request $request)
    {
        $query = ProviderProfile::query()
            ->with(['categories', 'user.media'])
            ->withAvg('providerReviews as rating', 'rating')
            ->withCount('providerReviews as reviews_count')
            ->whereHas('user', fn ($q) => $q->where('role', 'provider'));

        if ($request->filled('q')) {
            $search = trim((string) $request->query('q'));
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('country', 'like', "%{$search}%")
                    ->orWhereHas('categories', fn ($cat) => $cat->where('name', 'like', "%{$search}%"));
            });
        }

        if ($request->filled('country')) {
            $country = trim((string) $request->query('country'));
            $query->where('country', $country);
        }

        if ($request->filled('city')) {
            $city = trim((string) $request->query('city'));
            $query->where('city', $city);
        }

        if ($request->filled('category') || $request->filled('service')) {
            $category = trim((string) ($request->query('category') ?? $request->query('service')));
            $query->whereHas('categories', function ($q) use ($category) {
                $q->where('name', $category)->orWhere('slug', $category);
            });
        }

        $providers = $query
            ->orderByDesc('is_verified')
            ->orderBy('company_name')
            ->paginate((int) $request->integer('per_page', 50));

        $providers->getCollection()->transform(fn (ProviderProfile $profile) => $this->providerPayload($profile, false));

        return response()->json([
            'message' => 'Providers retrieved successfully.',
            'data' => $providers,
        ]);
    }

    /**
     * Show one public provider profile for daters.
     */
    public function show(int $provider)
    {
        $profile = ProviderProfile::query()
            ->with(['categories', 'user.media', 'providerReviews' => fn ($q) => $q->with('reviewer.profile')->latest()->limit(3)])
            ->withAvg('providerReviews as rating', 'rating')
            ->withCount('providerReviews as reviews_count')
            ->whereHas('user', fn ($q) => $q->where('role', 'provider'))
            ->findOrFail($provider);

        return response()->json([
            'message' => 'Provider retrieved successfully.',
            'data' => $this->providerPayload($profile, true),
        ]);
    }

    public function reviews(Request $request, int $provider)
    {
        $profile = ProviderProfile::query()
            ->whereHas('user', fn ($q) => $q->where('role', 'provider'))
            ->findOrFail($provider);

        $reviews = $profile->providerReviews()
            ->with('reviewer.profile')
            ->latest()
            ->paginate((int) $request->integer('per_page', 20));

        $reviews->getCollection()->transform(fn ($review) => [
            'id' => (string) $review->id,
            'userName' => $review->reviewer?->profile?->full_name ?? $review->reviewer?->name ?? 'Dater',
            'rating' => (int) $review->rating,
            'text' => $review->comment ?? '',
            'date' => $review->created_at?->diffForHumans(),
        ]);

        return response()->json([
            'message' => 'Provider reviews retrieved successfully.',
            'data' => $reviews,
        ]);
    }

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
                'id_required' => false,
                'currency' => 'USD',
            ]);
        }

        $media = $user->media()->whereIn('type', ['avatar', 'provider_gallery'])->get();
        $avatar = $media->where('type', 'avatar')->last(); // Get latest avatar
        $gallery = $media->where('type', 'provider_gallery')->values();

        // If media avatar exists, use it as the profile image source of truth
        if ($avatar) {
            $profile->image = $avatar->url;
        }

        $pendingBookings = $profile ? DateVoucher::where('provider_profile_id', $profile->id)
            ->where('status', DateVoucher::STATUS_PENDING_PROVIDER)
            ->count() : 0;
        $confirmedBookings = $profile ? DateVoucher::where('provider_profile_id', $profile->id)
            ->whereIn('status', [DateVoucher::STATUS_ACTIVE, DateVoucher::STATUS_REDEEMED, DateVoucher::STATUS_COMPLETED])
            ->count() : 0;
        $upcomingBookings = $profile ? DateVoucher::where('provider_profile_id', $profile->id)
            ->whereIn('status', [DateVoucher::STATUS_ACTIVE, DateVoucher::STATUS_REDEEMED, DateVoucher::STATUS_COMPLETED])
            ->with($this->dateVoucherService->voucherRelations())
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (DateVoucher $voucher) => $this->dateVoucherService->voucherPayload($voucher, $user))
            ->values() : [];

        return response()->json([
            'profile' => $profile,
            'gallery' => $gallery,
            'counts' => [
                'unread_notifications' => $user->notifications()->whereNull('read_at')->count(),
                'unread_messages' => ChatMessage::query()
                    ->whereNull('read_at')
                    ->where('sender_id', '!=', $user->id)
                    ->whereHas('thread', function ($q) use ($user) {
                        $q->where('owner_id', $user->id)
                            ->orWhere('winner_user_id', $user->id)
                            ->orWhere('customer_id', $user->id)
                            ->orWhere('provider_id', $user->id);
                    })
                    ->count(),
                'pending_bookings' => $pendingBookings,
                'confirmed_bookings' => $confirmedBookings,
                'unconfirmed_bookings' => $pendingBookings,
            ],
            'upcoming_bookings' => $upcomingBookings,
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
            'currency' => 'nullable|string|size:3',
            'discount_percentage' => 'required|integer|min:10|max:50',
            'minimum_spend' => 'nullable|numeric|min:0|max:99999999.99',
            'booking_required' => 'nullable|boolean',
            'id_required' => 'nullable|boolean',
            'categories' => 'nullable|array',
            'categories.*' => 'exists:provider_categories,id',
        ]);

        $profile = $user->providerProfile;

        if (!$profile) {
            $profile = new ProviderProfile(['user_id' => $user->id]);
        }

        $settings = $request->only([
            'image',
            'company_name',
            'description',
            'website',
            'phone',
            'address',
            'city',
            'country',
            'minimum_spend',
            'booking_required',
            'id_required',
        ]);
        $settings['currency'] = $this->normalizeCurrency(
            $request->input('currency'),
            $request->input('country', $profile->country)
        );
        $settings['discount_percentage'] = (int) $request->input('discount_percentage');

        $profile->fill($settings);
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
            'code' => 'required|string',
            'total_spent' => 'nullable|numeric|min:0|max:99999999.99',
        ]);

        try {
            $voucher = $this->dateVoucherService->redeem(
                $user,
                trim((string) $request->input('code')),
                $request->filled('total_spent') ? (float) $request->input('total_spent') : null
            );

            return response()->json([
                'message' => 'Voucher redeemed successfully.',
                'data' => $this->dateVoucherService->voucherPayload($voucher, $user),
            ]);
        } catch (HttpException $e) {
            return response()->json(['message' => $e->getMessage()], $e->getStatusCode());
        }
    }
    
    /**
     * Get all provider categories.
     */
    public function getCategories()
    {
        return response()->json(ProviderCategory::all());
    }

    private function providerPayload(ProviderProfile $profile, bool $includeGallery): array
    {
        $user = $profile->user;
        $media = $user?->media ?? collect();
        $avatar = $media->where('type', 'avatar')->whereNull('hidden_at')->sortByDesc('id')->first();
        $gallery = $media->where('type', 'provider_gallery')->whereNull('hidden_at')->sortByDesc('id')->values();
        $image = $profile->image ?: $avatar?->url ?: $gallery->first()?->url;
        $categories = $profile->categories->map(fn (ProviderCategory $category) => [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
        ])->values();
        $primaryCategory = $categories->first()['name'] ?? 'Venue';

        return [
            'id' => $profile->id,
            'user_id' => $profile->user_id,
            'name' => $profile->company_name ?: $user?->name ?: 'Provider',
            'category' => $primaryCategory,
            'categories' => $categories,
            'city' => $profile->city,
            'country' => $profile->country,
            'currency' => $profile->currency ?: $this->currencyForCountry($profile->country),
            'address' => $profile->address,
            'description' => $profile->description,
            'website' => $profile->website,
            'phone' => $profile->phone,
            'imageUrl' => $image,
            'gallery' => $includeGallery ? $gallery->map(fn ($item) => [
                'id' => $item->id,
                'url' => $item->url,
            ])->all() : [],
            'reviews' => $includeGallery ? $profile->providerReviews
                ->sortByDesc('created_at')
                ->map(fn ($review) => [
                    'id' => (string) $review->id,
                    'userName' => $review->reviewer?->profile?->full_name ?? $review->reviewer?->name ?? 'Dater',
                    'rating' => (int) $review->rating,
                    'text' => $review->comment ?? '',
                    'date' => $review->created_at?->diffForHumans(),
                ])
                ->values()
                ->all() : [],
            'discountPercentage' => (int) ($profile->discount_percentage ?? 10),
            'minimumSpend' => $profile->minimum_spend !== null ? (float) $profile->minimum_spend : null,
            'bookingRequired' => (bool) $profile->booking_required,
            'idRequired' => (bool) $profile->id_required,
            'isVerified' => (bool) $profile->is_verified,
            'rating' => $profile->rating !== null ? round((float) $profile->rating, 1) : null,
            'reviewsCount' => (int) ($profile->reviews_count ?? 0),
            'created_at' => $profile->created_at,
        ];
    }

    private function normalizeCurrency(?string $currency, ?string $country): string
    {
        $currency = strtoupper(trim((string) $currency));
        if (preg_match('/^[A-Z]{3}$/', $currency)) {
            return $currency;
        }

        return $this->currencyForCountry($country);
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
