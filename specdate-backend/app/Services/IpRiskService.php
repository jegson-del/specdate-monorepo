<?php

namespace App\Services;

use App\Models\IpRiskEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class IpRiskService
{
    public function recordRateLimitHit(Request $request, string $eventType, array $metadata = []): ?IpRiskEvent
    {
        return $this->recordEvent(
            $request->user()?->id,
            (string) $request->ip(),
            $eventType,
            $request->method(),
            $request->path(),
            (string) $request->userAgent(),
            $metadata,
            true
        );
    }

    public function recordEvent(
        ?int $userId,
        string $ip,
        string $eventType,
        ?string $method = null,
        ?string $path = null,
        ?string $userAgent = null,
        array $metadata = [],
        bool $dedupe = false
    ): ?IpRiskEvent {
        $dedupeKey = implode(':', [
            'ip-risk',
            $eventType,
            $userId ?: 'guest',
            str_replace([':', '.'], '-', $ip),
            sha1((string) $path),
        ]);

        if ($dedupe && ! Cache::add($dedupeKey, true, now()->addMinute())) {
            return null;
        }

        return IpRiskEvent::create([
            'user_id' => $userId,
            'ip_address' => $ip,
            'event_type' => $eventType,
            'severity' => $this->severityFor($eventType),
            'score' => $this->scoreFor($eventType),
            'method' => $method,
            'path' => $path,
            'user_agent' => substr((string) $userAgent, 0, 1000),
            'metadata' => $metadata,
            'occurred_at' => now(),
        ]);
    }

    private function severityFor(string $eventType): string
    {
        return match ($eventType) {
            IpRiskEvent::EVENT_REPORT_RATE_LIMIT,
            IpRiskEvent::EVENT_APPEAL_RATE_LIMIT,
            IpRiskEvent::EVENT_FALSE_REPORT_PATTERN,
            IpRiskEvent::EVENT_REGISTRATION_IP_CLUSTER => IpRiskEvent::SEVERITY_MEDIUM,
            IpRiskEvent::EVENT_DUPLICATE_DEVICE_REGISTRATION => IpRiskEvent::SEVERITY_HIGH,
            default => IpRiskEvent::SEVERITY_LOW,
        };
    }

    private function scoreFor(string $eventType): int
    {
        return match ($eventType) {
            IpRiskEvent::EVENT_REPORT_RATE_LIMIT => 5,
            IpRiskEvent::EVENT_APPEAL_RATE_LIMIT => 4,
            IpRiskEvent::EVENT_FALSE_REPORT_PATTERN => 6,
            IpRiskEvent::EVENT_DUPLICATE_DEVICE_REGISTRATION => 8,
            IpRiskEvent::EVENT_REGISTRATION_IP_CLUSTER => 5,
            default => 1,
        };
    }
}
