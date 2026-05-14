<?php

namespace App\Http\Middleware;

use App\Services\DeviceFingerprintService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class CaptureDeviceFingerprint
{
    public function __construct(private DeviceFingerprintService $fingerprints)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            try {
                $this->fingerprints->capture($user, $request);
            } catch (\Throwable $exception) {
                Log::warning('Device fingerprint capture failed.', [
                    'user_id' => $user->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return $next($request);
    }
}
