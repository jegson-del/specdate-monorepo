<?php

namespace Tests\Feature;

use App\Mail\NewProviderAdminNotificationMail;
use App\Mail\ProviderApprovedMail;
use App\Mail\WelcomeProviderMail;
use App\Models\Media;
use App\Models\ProviderCategory;
use App\Models\ProviderProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProviderMarketplaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_provider_marketplace_lists_real_provider_profiles(): void
    {
        $dater = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider', 'name' => 'Provider Owner']);
        $category = ProviderCategory::create(['name' => 'Restaurant', 'slug' => 'restaurant']);
        $profile = ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => 'Table House',
            'description' => 'A calm place for date night.',
            'city' => 'Lagos',
            'country' => 'Nigeria',
            'address' => '12 Date Street',
            'discount_percentage' => 20,
            'minimum_spend' => 15000,
            'booking_required' => true,
            'is_verified' => true,
        ]);
        $profile->categories()->attach($category->id);
        Media::create([
            'user_id' => $provider->id,
            'file_path' => 'uploads/provider.jpg',
            'url' => 'https://example.com/provider.jpg',
            'type' => 'avatar',
            'mime_type' => 'image/jpeg',
            'size' => 100,
        ]);

        Sanctum::actingAs($dater);

        $this->getJson('/api/providers')
            ->assertOk()
            ->assertJsonPath('data.data.0.id', $profile->id)
            ->assertJsonPath('data.data.0.user_id', $provider->id)
            ->assertJsonPath('data.data.0.name', 'Table House')
            ->assertJsonPath('data.data.0.category', 'Restaurant')
            ->assertJsonPath('data.data.0.imageUrl', 'https://example.com/provider.jpg')
            ->assertJsonPath('data.data.0.discountPercentage', 20)
            ->assertJsonPath('data.data.0.minimumSpend', 15000)
            ->assertJsonPath('data.data.0.bookingRequired', true)
            ->assertJsonPath('data.data.0.isVerified', true);
    }

    public function test_provider_detail_returns_gallery_and_voucher_ready_ids(): void
    {
        $dater = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);
        $profile = ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => 'Gallery Lounge',
            'discount_percentage' => 15,
            'is_verified' => true,
        ]);
        Media::create([
            'user_id' => $provider->id,
            'file_path' => 'uploads/gallery.jpg',
            'url' => 'https://example.com/gallery.jpg',
            'type' => 'provider_gallery',
            'mime_type' => 'image/jpeg',
            'size' => 100,
        ]);

        Sanctum::actingAs($dater);

        $this->getJson("/api/providers/{$profile->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $profile->id)
            ->assertJsonPath('data.user_id', $provider->id)
            ->assertJsonPath('data.gallery.0.url', 'https://example.com/gallery.jpg')
            ->assertJsonPath('data.imageUrl', 'https://example.com/gallery.jpg');
    }

    public function test_web_provider_registration_creates_pending_provider_and_sends_emails(): void
    {
        Mail::fake();
        config(['mail.admin_address' => 'admin@dateusher.test']);
        Cache::put('otp:email:partner@example.com', '123456', 600);

        $this->postJson('/api/provider-registrations', [
            'business_name' => 'Velvet Table',
            'service_type' => 'restaurant',
            'email' => 'partner@example.com',
            'address' => '12 Date Street, Victoria Island, Lagos',
            'postcode' => '101241',
            'country_code' => 'NG',
            'country_name' => 'Nigeria',
            'phone' => '+2348012345678',
            'notes' => 'Private dining and chef-led date nights.',
            'otp_code' => '123456',
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending_review');

        $provider = User::where('email', 'partner@example.com')->firstOrFail();
        $this->assertSame('provider', $provider->role);

        $this->assertDatabaseHas('provider_profiles', [
            'user_id' => $provider->id,
            'company_name' => 'Velvet Table',
            'country' => 'Nigeria',
            'postcode' => '101241',
            'phone' => '+2348012345678',
            'is_verified' => false,
        ]);
        $this->assertDatabaseHas('provider_categories', [
            'name' => 'Restaurant',
            'slug' => 'restaurant',
        ]);

        Mail::assertQueued(WelcomeProviderMail::class, fn ($mail) => $mail->hasTo('partner@example.com'));
        Mail::assertQueued(NewProviderAdminNotificationMail::class, fn ($mail) => $mail->hasTo('admin@dateusher.test'));
    }

    public function test_web_provider_registration_requires_valid_email_otp(): void
    {
        Mail::fake();
        Cache::put('otp:email:partner@example.com', '123456', 600);

        $this->postJson('/api/provider-registrations', [
            'business_name' => 'Velvet Table',
            'service_type' => 'restaurant',
            'email' => 'partner@example.com',
            'address' => '12 Date Street, Victoria Island, Lagos',
            'postcode' => '101241',
            'country_code' => 'NG',
            'country_name' => 'Nigeria',
            'phone' => '+2348012345678',
            'notes' => 'Private dining and chef-led date nights.',
            'otp_code' => '999999',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['otp_code']);

        $this->assertDatabaseMissing('users', ['email' => 'partner@example.com']);
        Mail::assertNothingSent();
    }

    public function test_api_register_rejects_provider_role(): void
    {
        $this->postJson('/api/register', [
            'username' => 'providerbypass',
            'email' => 'provider-bypass@example.com',
            'mobile' => '+447700900123',
            'role' => 'provider',
            'dob' => now()->subYears(25)->toDateString(),
            'password' => 'Password123!',
            'terms_accepted' => true,
        ])
            ->assertUnprocessable()
            ->assertJsonPath('data.errors.role.0', 'The selected role is invalid.');

        $this->assertDatabaseMissing('users', [
            'email' => 'provider-bypass@example.com',
        ]);
    }

    public function test_admin_can_approve_provider_and_send_password_setup_link(): void
    {
        Mail::fake();
        config(['app.frontend_url' => 'https://dateusher.test']);

        $admin = User::factory()->create(['role' => 'admin']);
        $provider = User::factory()->create([
            'role' => 'provider',
            'email' => 'partner@example.com',
            'email_verified_at' => null,
        ]);
        $profile = ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => 'Velvet Table',
            'discount_percentage' => 10,
            'is_verified' => false,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/providers/{$profile->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.is_verified', true);

        $profile->refresh();
        $this->assertTrue($profile->is_verified);
        $this->assertNotNull($profile->approved_at);
        $this->assertNotNull($provider->fresh()->email_verified_at);

        Mail::assertQueued(ProviderApprovedMail::class, function (ProviderApprovedMail $mail) {
            return $mail->hasTo('partner@example.com')
                && str_starts_with($mail->setupUrl, 'https://dateusher.test/provider/setup-password?')
                && str_contains($mail->setupUrl, 'email=partner%40example.com');
        });
    }

    public function test_approved_provider_can_set_password_with_setup_token(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
            'email' => 'partner@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('unusable-placeholder'),
            'terms_accepted' => false,
        ]);
        ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => 'Velvet Table',
            'discount_percentage' => 10,
            'is_verified' => true,
            'approved_at' => now(),
        ]);
        $token = Password::broker()->createToken($provider);

        $this->postJson('/api/provider-password/setup', [
            'email' => 'partner@example.com',
            'token' => $token,
            'password' => 'NewProviderPassword123!',
            'password_confirmation' => 'NewProviderPassword123!',
            'terms_accepted' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.next_step', 'download_app');

        $provider->refresh();
        $this->assertTrue(Hash::check('NewProviderPassword123!', $provider->password));
        $this->assertTrue($provider->terms_accepted);

        $this->postJson('/api/login', [
            'email' => 'partner@example.com',
            'password' => 'NewProviderPassword123!',
        ])->assertOk();
    }

    public function test_unverified_provider_is_hidden_from_public_marketplace(): void
    {
        $dater = User::factory()->create();
        $provider = User::factory()->create(['role' => 'provider']);
        ProviderProfile::create([
            'user_id' => $provider->id,
            'company_name' => 'Pending Venue',
            'discount_percentage' => 10,
            'is_verified' => false,
        ]);

        Sanctum::actingAs($dater);

        $this->getJson('/api/providers')
            ->assertOk()
            ->assertJsonCount(0, 'data.data');
    }
}
