<?php

namespace App\Services;

use App\Models\DeviceFingerprint;
use App\Models\IpRiskEvent;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminRiskService
{
    public function users(User $admin, array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $this->ensureAdmin($admin);

        $search = trim((string) ($filters['q'] ?? ''));
        $perPage = max(1, min($perPage, 100));

        $users = User::query()
            ->with('reporterRiskScore')
            ->withCount(['deviceFingerprints', 'ipRiskEvents', 'moderationStrikes'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($nested) use ($search) {
                    $nested->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('mobile', 'like', "%{$search}%");
                });
            })
            ->where(function ($query) {
                $query->where('risk_score', '>', 0)
                    ->orWhere('strike_count', '>', 0)
                    ->orWhereHas('reporterRiskScore', fn ($score) => $score->where('risk_score', '>', 0))
                    ->orWhereHas('ipRiskEvents')
                    ->orWhereHas('deviceFingerprints');
            })
            ->orderByDesc('risk_score')
            ->orderByDesc('strike_count')
            ->latest()
            ->paginate($perPage);

        $users->getCollection()->transform(fn (User $user) => $this->riskUserPayload($user));

        return $users;
    }

    public function ipEvents(User $admin, array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $this->ensureAdmin($admin);

        $perPage = max(1, min($perPage, 100));
        $events = IpRiskEvent::query()
            ->with('user:id,name,username,email,role,risk_score,strike_count')
            ->when(($filters['event_type'] ?? null), fn ($query, string $eventType) => $query->where('event_type', $eventType))
            ->when(($filters['severity'] ?? null), fn ($query, string $severity) => $query->where('severity', $severity))
            ->when(($filters['ip'] ?? null), fn ($query, string $ip) => $query->where('ip_address', 'like', "%{$ip}%"))
            ->when(($filters['user_id'] ?? null), fn ($query, int $userId) => $query->where('user_id', $userId))
            ->latest('occurred_at')
            ->paginate($perPage);

        $events->getCollection()->transform(fn (IpRiskEvent $event) => $this->ipEventPayload($event));

        return $events;
    }

    public function userRisk(User $admin, User $user): array
    {
        $this->ensureAdmin($admin);

        $user->load('reporterRiskScore');
        $user->loadCount(['deviceFingerprints', 'ipRiskEvents', 'moderationStrikes']);

        return array_merge($this->riskUserPayload($user), [
            'recent_ip_events' => IpRiskEvent::query()
                ->where('user_id', $user->id)
                ->latest('occurred_at')
                ->limit(10)
                ->get()
                ->map(fn (IpRiskEvent $event) => $this->ipEventPayload($event))
                ->all(),
            'recent_devices' => DeviceFingerprint::query()
                ->where('user_id', $user->id)
                ->latest('last_seen_at')
                ->limit(10)
                ->get()
                ->map(fn (DeviceFingerprint $device) => [
                    'id' => $device->id,
                    'platform' => $device->platform,
                    'app_version' => $device->app_version,
                    'device_model' => $device->device_model,
                    'ip_address' => $device->ip_address,
                    'first_seen_at' => $device->first_seen_at,
                    'last_seen_at' => $device->last_seen_at,
                    'last_authenticated_at' => $device->last_authenticated_at,
                ])
                ->all(),
        ]);
    }

    private function riskUserPayload(User $user): array
    {
        $reporterRisk = $user->reporterRiskScore;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'role' => $user->role,
            'moderation_status' => $user->moderation_status,
            'user_risk_score' => (int) ($user->risk_score ?? 0),
            'strike_count' => (int) ($user->strike_count ?? 0),
            'device_count' => (int) ($user->device_fingerprints_count ?? 0),
            'ip_risk_events_count' => (int) ($user->ip_risk_events_count ?? 0),
            'moderation_strikes_count' => (int) ($user->moderation_strikes_count ?? 0),
            'reporter_risk_score' => (int) ($reporterRisk?->risk_score ?? 0),
            'false_report_count' => (int) ($reporterRisk?->false_report_count ?? 0),
            'valid_report_count' => (int) ($reporterRisk?->valid_report_count ?? 0),
            'last_false_report_at' => $reporterRisk?->last_false_report_at,
            'last_valid_report_at' => $reporterRisk?->last_valid_report_at,
            'created_at' => $user->created_at,
        ];
    }

    private function ipEventPayload(IpRiskEvent $event): array
    {
        return [
            'id' => $event->id,
            'user_id' => $event->user_id,
            'ip_address' => $event->ip_address,
            'event_type' => $event->event_type,
            'severity' => $event->severity,
            'score' => (int) $event->score,
            'method' => $event->method,
            'path' => $event->path,
            'user_agent' => $event->user_agent,
            'metadata' => $event->metadata,
            'occurred_at' => $event->occurred_at,
            'user' => $event->user ? [
                'id' => $event->user->id,
                'name' => $event->user->name,
                'username' => $event->user->username,
                'email' => $event->user->email,
                'role' => $event->user->role,
                'risk_score' => (int) ($event->user->risk_score ?? 0),
                'strike_count' => (int) ($event->user->strike_count ?? 0),
            ] : null,
        ];
    }

    private function ensureAdmin(?User $user): void
    {
        if (! $user || $user->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }
    }
}
