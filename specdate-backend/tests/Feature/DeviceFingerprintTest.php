<?php

namespace Tests\Feature;

use App\Models\DeviceFingerprint;
use App\Models\User;
use App\Services\DeviceFingerprintService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeviceFingerprintTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_request_with_device_headers_records_fingerprint(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $fingerprint = 'install_test_device_12345';

        $this->withHeaders([
            DeviceFingerprintService::HEADER_FINGERPRINT => $fingerprint,
            DeviceFingerprintService::HEADER_PLATFORM => 'ios',
            DeviceFingerprintService::HEADER_APP_VERSION => '1.2.3',
            DeviceFingerprintService::HEADER_DEVICE_MODEL => 'iPhone',
            'User-Agent' => 'SpecDate Test App',
        ])->getJson('/api/user')->assertOk();

        $this->assertDatabaseHas('device_fingerprints', [
            'user_id' => $user->id,
            'fingerprint_hash' => hash('sha256', $fingerprint),
            'platform' => 'ios',
            'app_version' => '1.2.3',
            'device_model' => 'iPhone',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'SpecDate Test App',
        ]);
    }

    public function test_repeated_device_header_updates_existing_fingerprint(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $headers = [
            DeviceFingerprintService::HEADER_FINGERPRINT => 'install_test_device_67890',
            DeviceFingerprintService::HEADER_PLATFORM => 'android',
        ];

        $this->withHeaders($headers)->getJson('/api/user')->assertOk();
        $this->withHeaders($headers)->getJson('/api/user')->assertOk();

        $this->assertSame(1, DeviceFingerprint::query()->where('user_id', $user->id)->count());
    }

    public function test_missing_device_header_does_not_record_fingerprint(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/user')->assertOk();

        $this->assertSame(0, DeviceFingerprint::query()->count());
    }
}
