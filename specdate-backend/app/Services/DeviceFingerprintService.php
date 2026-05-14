<?php

namespace App\Services;

use App\Models\DeviceFingerprint;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DeviceFingerprintService
{
    public const HEADER_FINGERPRINT = 'X-Device-Fingerprint';
    public const HEADER_PLATFORM = 'X-Device-Platform';
    public const HEADER_APP_VERSION = 'X-App-Version';
    public const HEADER_DEVICE_MODEL = 'X-Device-Model';

    public function capture(User $user, Request $request): ?DeviceFingerprint
    {
        $rawFingerprint = trim((string) $request->header(self::HEADER_FINGERPRINT));
        if (strlen($rawFingerprint) < 12) {
            return null;
        }

        $now = now();
        $fingerprintHash = hash('sha256', $rawFingerprint);
        $attributes = [
            'platform' => $this->cleanHeader($request, self::HEADER_PLATFORM, 40),
            'app_version' => $this->cleanHeader($request, self::HEADER_APP_VERSION, 80),
            'device_model' => $this->cleanHeader($request, self::HEADER_DEVICE_MODEL, 160),
            'ip_address' => (string) $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 1000, ''),
            'last_seen_at' => $now,
            'last_authenticated_at' => $now,
            'metadata' => [
                'source' => 'mobile_api',
            ],
        ];

        $device = DeviceFingerprint::query()->firstOrNew([
            'user_id' => $user->id,
            'fingerprint_hash' => $fingerprintHash,
        ]);

        if (! $device->exists) {
            $device->first_seen_at = $now;
        }

        $device->fill($attributes);
        $device->save();

        return $device;
    }

    private function cleanHeader(Request $request, string $header, int $limit): ?string
    {
        $value = trim((string) $request->header($header));
        if ($value === '') {
            return null;
        }

        return Str::limit($value, $limit, '');
    }
}
