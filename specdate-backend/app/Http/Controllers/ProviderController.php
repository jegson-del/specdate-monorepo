<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\DateVoucher;
use App\Models\ProviderCategory;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Services\AuthService;
use App\Services\DateVoucherService;
use App\Services\EmailService;
use App\Services\PhoneBlacklistService;
use App\Services\ProviderInviteService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

use Illuminate\Database\Eloquent\Factories\HasFactory;
class ProviderController extends Controller
{
    public function __construct(
        private DateVoucherService $dateVoucherService,
        private AuthService $authService,
        private EmailService $emailService,
        private PhoneBlacklistService $phoneBlacklistService,
        private ProviderInviteService $providerInviteService
    )
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
            ->where('is_verified', true)
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
            $country = strtolower(trim((string) $request->query('country')));
            $query->whereRaw('LOWER(TRIM(country)) = ?', [$country]);
        }

        if ($request->filled('city')) {
            $city = strtolower(trim((string) $request->query('city')));
            $query->whereRaw('LOWER(TRIM(city)) = ?', [$city]);
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
            ->where('is_verified', true)
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

    public function approveRegistration(Request $request, int $provider)
    {
        if ($request->user()?->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $profile = ProviderProfile::query()
            ->with('user')
            ->whereHas('user', fn ($q) => $q->where('role', 'provider'))
            ->findOrFail($provider);

        $user = DB::transaction(function () use ($profile) {
            $profile->forceFill([
                'is_verified' => true,
                'approved_at' => $profile->approved_at ?? now(),
            ])->save();

            $profile->user->forceFill([
                'email_verified_at' => $profile->user->email_verified_at ?? now(),
            ])->save();

            return $profile->user->fresh('providerProfile.categories');
        });

        $token = Password::broker()->createToken($user);
        $setupUrl = $this->providerPasswordSetupUrl($user->email, $token);

        $setupEmailSent = $this->emailService->sendProviderApproved($user, $setupUrl);

        return response()->json([
            'message' => $setupEmailSent
                ? 'Provider approved and password setup email sent.'
                : 'Provider approved, but password setup email could not be sent. Please retry sending the setup email.',
            'data' => [
                'id' => $user->providerProfile?->id,
                'status' => 'approved',
                'is_verified' => true,
                'setup_email_sent' => $setupEmailSent,
            ],
        ]);
    }

    public function setupPassword(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|string|email|max:254',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required|string',
            'terms_accepted' => 'required|accepted',
        ]);

        $email = strtolower(trim($data['email']));
        $user = User::query()
            ->where('email', $email)
            ->where('role', 'provider')
            ->with('providerProfile')
            ->first();

        if (!$user || !$user->providerProfile?->is_verified) {
            throw ValidationException::withMessages([
                'email' => ['This provider account is not approved for password setup.'],
            ]);
        }

        $status = Password::broker()->reset(
            [
                'email' => $email,
                'token' => $data['token'],
                'password' => $data['password'],
                'password_confirmation' => $data['password_confirmation'],
            ],
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                    'email_verified_at' => $user->email_verified_at ?? now(),
                    'terms_accepted' => true,
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'token' => ['This password setup link is invalid or expired.'],
            ]);
        }

        return response()->json([
            'message' => 'Password set successfully. Download the DateUsher app and log in with your new password.',
            'data' => [
                'email' => $email,
                'next_step' => 'download_app',
            ],
        ]);
    }

    /**
     * Public web provider-interest registration.
     */
    public function registerInterest(Request $request)
    {
        $data = $request->validate([
            'business_name' => 'required|string|min:2|max:120',
            'service_type' => 'required|string|in:hotel,spa,restaurant,venue,experience,other',
            'email' => 'required|string|email|max:254|unique:users,email',
            'address' => 'required|string|min:10|max:500',
            'city' => 'required|string|min:2|max:120',
            'postcode' => 'required|string|min:2|max:32',
            'country_code' => 'required|string|size:2',
            'country_name' => 'nullable|string|max:120',
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+[1-9]\d{6,14}$/', 'unique:users,mobile'],
            'notes' => 'nullable|string|max:2000',
            'otp_code' => 'required|string|size:6',
            'invite_token' => 'nullable|string',
        ]);

        $data['email'] = strtolower(trim($data['email']));
        if ($this->phoneBlacklistService->isBlacklisted($data['phone'])) {
            throw ValidationException::withMessages([
                'phone' => [$this->phoneBlacklistService->blockedValidationMessage()],
            ]);
        }

        if (!$this->authService->verifyOtp('email', $data['email'], $data['otp_code'])) {
            throw ValidationException::withMessages([
                'otp_code' => ['Invalid or expired verification code.'],
            ]);
        }

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => trim($data['business_name']),
                'username' => $this->uniqueProviderUsername($data['business_name']),
                'email' => $data['email'],
                'mobile' => trim($data['phone']),
                'password' => Hash::make(Str::random(48)),
                'role' => 'provider',
                'terms_accepted' => false,
            ]);

            $profile = $user->providerProfile()->create([
                'company_name' => trim($data['business_name']),
                'description' => trim((string) ($data['notes'] ?? '')) ?: null,
                'phone' => trim($data['phone']),
                'address' => trim($data['address']),
                'city' => trim($data['city']),
                'postcode' => strtoupper(trim($data['postcode'])),
                'country' => trim((string) ($data['country_name'] ?? '')) ?: strtoupper($data['country_code']),
                'discount_percentage' => 10,
                'booking_required' => false,
                'id_required' => false,
                'is_verified' => false,
            ]);

            $category = $this->providerCategoryForService($data['service_type']);
            if ($category) {
                $profile->categories()->sync([$category->id]);
            }

            return $user->load('providerProfile.categories');
        });

        if (!empty($data['invite_token'])) {
            $this->providerInviteService->accept(
                (string) $data['invite_token'],
                (int) $user->providerProfile->id,
                $user->email
            );
        }

        $this->emailService->sendWelcomeProvider($user);
        $this->emailService->sendNewProviderAdminNotification($user);

        return response()->json([
            'message' => 'Provider registration received. We will review your application and contact you by email.',
            'data' => [
                'id' => $user->providerProfile?->id,
                'status' => 'pending_review',
            ],
        ], 201);
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

        $media = $user->media()->whereIn('type', ['avatar', 'provider_gallery'])->get()->filter(fn ($item) => $item->isShareable());
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
        $shareableMedia = $media->whereNull('hidden_at')->filter(fn ($item) => $item->isShareable());
        $avatar = $shareableMedia->where('type', 'avatar')->sortByDesc('id')->first();
        $gallery = $shareableMedia->where('type', 'provider_gallery')->sortByDesc('id')->values();
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

    private function providerCategoryForService(string $serviceType): ?ProviderCategory
    {
        $name = [
            'hotel' => 'Hotel',
            'spa' => 'Spa',
            'restaurant' => 'Restaurant',
            'venue' => 'Venue',
            'experience' => 'Experience',
            'other' => 'Other',
        ][$serviceType] ?? null;

        if (!$name) {
            return null;
        }

        return ProviderCategory::firstOrCreate(
            ['slug' => Str::slug($name)],
            ['name' => $name]
        );
    }

    private function providerPasswordSetupUrl(string $email, string $token): string
    {
        $baseUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');

        return $baseUrl . '/provider/setup-password?' . http_build_query([
            'email' => $email,
            'token' => $token,
        ]);
    }

    private function uniqueProviderUsername(string $businessName): string
    {
        $base = Str::slug($businessName);
        $base = $base !== '' ? Str::limit($base, 32, '') : 'provider';
        $username = $base;
        $counter = 1;

        while (User::where('username', $username)->exists()) {
            $counter++;
            $username = Str::limit($base, 26, '') . '-' . $counter;
        }

        return $username;
    }
}
