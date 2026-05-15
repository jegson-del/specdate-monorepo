<?php

namespace Tests\Feature;

use App\Models\PhoneBlacklistEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PhoneBlacklistTest extends TestCase
{
    use RefreshDatabase;

    public function test_mobile_registration_rejects_blacklisted_phone(): void
    {
        $this->blacklist('+447700900999');

        $this->postJson('/api/register', [
            'username' => 'blockeduser',
            'email' => 'blocked@example.com',
            'mobile' => '+44 7700 900999',
            'dob' => now()->subYears(25)->toDateString(),
            'password' => 'Password123!',
            'otp_code' => '123456',
            'channel' => 'mobile',
            'target' => '+44 7700 900999',
            'terms_accepted' => true,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'This phone number cannot be used on DateUsher.')
            ->assertJsonPath('data.errors.mobile.0', 'This phone number cannot be used on DateUsher.');

        $this->assertDatabaseMissing('users', ['email' => 'blocked@example.com']);
    }

    public function test_mobile_otp_rejects_blacklisted_phone(): void
    {
        $this->blacklist('+447700900998');

        $this->postJson('/api/send-otp', [
            'channel' => 'mobile',
            'target' => '+44 7700 900998',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'This phone number cannot be used on DateUsher.')
            ->assertJsonPath('data.errors.target.0', 'This phone number cannot be used on DateUsher.');

        $this->assertFalse(Cache::has('otp:mobile:+44 7700 900998'));
    }

    public function test_provider_registration_rejects_blacklisted_phone(): void
    {
        Mail::fake();
        Cache::put('otp:email:partner@example.com', '123456', 600);
        $this->blacklist('+2348012345678');

        $this->postJson('/api/provider-registrations', [
            'business_name' => 'Blocked Venue',
            'service_type' => 'restaurant',
            'email' => 'partner@example.com',
            'address' => '12 Date Street, Victoria Island',
            'city' => 'Lagos',
            'postcode' => '101241',
            'country_code' => 'NG',
            'country_name' => 'Nigeria',
            'phone' => '+2348012345678',
            'notes' => 'Private dining.',
            'otp_code' => '123456',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['phone']);

        $this->assertDatabaseMissing('users', ['email' => 'partner@example.com']);
        Mail::assertNothingSent();
    }

    public function test_expired_blacklist_entry_does_not_block_registration(): void
    {
        Cache::put('otp:mobile:+447700900997', '123456', 600);

        PhoneBlacklistEntry::create([
            'phone' => '+447700900997',
            'normalized_phone' => '+447700900997',
            'reason' => 'Expired test',
            'source' => 'test',
            'expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/api/register', [
            'username' => 'alloweduser',
            'email' => 'allowed@example.com',
            'mobile' => '+447700900997',
            'dob' => now()->subYears(25)->toDateString(),
            'password' => 'Password123!',
            'otp_code' => '123456',
            'channel' => 'mobile',
            'target' => '+447700900997',
            'terms_accepted' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'allowed@example.com']);
    }

    private function blacklist(string $phone): PhoneBlacklistEntry
    {
        return PhoneBlacklistEntry::create([
            'phone' => $phone,
            'normalized_phone' => $phone,
            'reason' => 'Known abuse pattern',
            'source' => 'test',
        ]);
    }
}
