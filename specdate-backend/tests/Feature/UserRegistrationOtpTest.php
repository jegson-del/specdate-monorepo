<?php

namespace Tests\Feature;

use App\Models\IpRiskEvent;
use App\Models\User;
use App\Services\DeviceFingerprintService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class UserRegistrationOtpTest extends TestCase
{
    use RefreshDatabase;

    public function test_mobile_user_registration_requires_phone_otp(): void
    {
        $this->postJson('/api/register', $this->registrationPayload([
            'otp_code' => null,
            'channel' => null,
            'target' => null,
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('data.errors.otp_code.0', 'Phone verification code is required.')
            ->assertJsonPath('data.errors.channel.0', 'The channel field is required.')
            ->assertJsonPath('data.errors.target.0', 'The target field is required.');

        $this->assertDatabaseMissing('users', ['email' => 'mobile-user@example.com']);
    }

    public function test_mobile_user_registration_rejects_email_otp_channel(): void
    {
        $this->postJson('/api/register', $this->registrationPayload([
            'otp_code' => '123456',
            'channel' => 'email',
            'target' => 'mobile-user@example.com',
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('data.errors.channel.0', 'Mobile phone verification is required for registration.');

        $this->assertDatabaseMissing('users', ['email' => 'mobile-user@example.com']);
    }

    public function test_mobile_user_registration_rejects_mismatched_phone_otp_target(): void
    {
        Cache::put('otp:mobile:+447700900111', '123456', 600);

        $this->postJson('/api/register', $this->registrationPayload([
            'otp_code' => '123456',
            'channel' => 'mobile',
            'target' => '+447700900111',
        ]))
            ->assertUnprocessable()
            ->assertJsonPath('data.errors.target.0', 'Phone verification must match the mobile number.');

        $this->assertDatabaseMissing('users', ['email' => 'mobile-user@example.com']);
    }

    public function test_mobile_user_registration_accepts_matching_phone_otp(): void
    {
        Cache::put('otp:mobile:+447700900123', '123456', 600);

        $this->postJson('/api/register', $this->registrationPayload())
            ->assertCreated()
            ->assertJsonPath('data.user.email', 'mobile-user@example.com')
            ->assertJsonStructure(['data' => ['token']]);

        $this->assertDatabaseHas('users', [
            'email' => 'mobile-user@example.com',
            'mobile' => '+447700900123',
            'role' => 'user',
        ]);
        $this->assertFalse(Cache::has('otp:mobile:+447700900123'));
    }

    public function test_duplicate_phone_registration_is_blocked(): void
    {
        User::factory()->create(['mobile' => '+447700900123']);
        Cache::put('otp:mobile:+447700900123', '123456', 600);

        $this->postJson('/api/register', $this->registrationPayload())
            ->assertUnprocessable()
            ->assertJsonPath('data.errors.mobile.0', 'The mobile has already been taken.');
    }

    public function test_registration_from_existing_device_creates_admin_risk_event(): void
    {
        $headers = [
            DeviceFingerprintService::HEADER_FINGERPRINT => 'shared-install-device-123',
            DeviceFingerprintService::HEADER_PLATFORM => 'ios',
            'User-Agent' => 'DateUsher Test App',
        ];

        $this->registerUser('firstdevice', 'first-device@example.com', '+447700900201', $headers)
            ->assertCreated();
        $this->registerUser('seconddevice', 'second-device@example.com', '+447700900202', $headers)
            ->assertCreated();

        $secondUser = User::where('email', 'second-device@example.com')->firstOrFail();
        $this->assertDatabaseHas('ip_risk_events', [
            'user_id' => $secondUser->id,
            'event_type' => IpRiskEvent::EVENT_DUPLICATE_DEVICE_REGISTRATION,
            'severity' => IpRiskEvent::SEVERITY_HIGH,
            'ip_address' => '127.0.0.1',
        ]);
    }

    public function test_repeated_registration_from_same_ip_creates_admin_risk_event(): void
    {
        $ip = '203.0.113.77';

        $this->registerUser('ipuserone', 'ip-one@example.com', '+447700900301', [], $ip)
            ->assertCreated();
        $this->registerUser('ipusertwo', 'ip-two@example.com', '+447700900302', [], $ip)
            ->assertCreated();
        $this->registerUser('ipuserthree', 'ip-three@example.com', '+447700900303', [], $ip)
            ->assertCreated();

        $thirdUser = User::where('email', 'ip-three@example.com')->firstOrFail();
        $this->assertDatabaseHas('ip_risk_events', [
            'user_id' => $thirdUser->id,
            'event_type' => IpRiskEvent::EVENT_REGISTRATION_IP_CLUSTER,
            'severity' => IpRiskEvent::SEVERITY_MEDIUM,
            'ip_address' => $ip,
        ]);
    }

    private function registrationPayload(array $overrides = []): array
    {
        return array_merge([
            'username' => 'mobileuser',
            'email' => 'mobile-user@example.com',
            'mobile' => '+447700900123',
            'dob' => now()->subYears(25)->toDateString(),
            'password' => 'Password123!',
            'otp_code' => '123456',
            'channel' => 'mobile',
            'target' => '+447700900123',
            'terms_accepted' => true,
        ], $overrides);
    }

    private function registerUser(
        string $username,
        string $email,
        string $mobile,
        array $headers = [],
        ?string $ip = null
    ) {
        Cache::put('otp:mobile:' . $mobile, '123456', 600);

        $request = $this->withHeaders($headers);
        if ($ip) {
            $request = $request->withServerVariables(['REMOTE_ADDR' => $ip]);
        }

        return $request->postJson('/api/register', $this->registrationPayload([
            'username' => $username,
            'email' => $email,
            'mobile' => $mobile,
            'target' => $mobile,
        ]));
    }
}
