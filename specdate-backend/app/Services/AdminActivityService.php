<?php

namespace App\Services;

use App\Events\AdminActivityCreated;
use App\Models\AdminActivityEvent;
use App\Models\Media;
use App\Models\ProviderProfile;
use App\Models\Report;
use App\Models\SupportTicket;

class AdminActivityService
{
    public function record(
        string $type,
        string $title,
        ?string $body = null,
        ?string $route = null,
        ?string $sourceType = null,
        ?int $sourceId = null,
        array $metadata = [],
    ): AdminActivityEvent {
        $activity = AdminActivityEvent::create([
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'route' => $route,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'metadata' => $metadata,
            'counts' => $this->counts(),
        ]);

        event(new AdminActivityCreated($activity));

        return $activity;
    }

    public function recent(int $limit = 25): array
    {
        $limit = max(1, min($limit, 100));

        return AdminActivityEvent::query()
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (AdminActivityEvent $activity) => $this->payload($activity))
            ->values()
            ->all();
    }

    public function counts(): array
    {
        $reportsOpen = Report::whereIn('status', ['open', 'reviewing'])->count();
        $mediaNeedsReview = $this->mediaNeedsReviewCount();

        return [
            'providers_pending' => ProviderProfile::where('is_verified', false)->whereNull('rejected_at')->count(),
            'reports_open' => $reportsOpen,
            'media_needs_review' => $mediaNeedsReview,
            'moderation_needs_review' => $reportsOpen + $mediaNeedsReview,
            'support_needs_admin' => SupportTicket::whereNotNull('user_id')
                ->whereIn('status', ['open', 'pending_admin'])
                ->count(),
            'contact_needs_admin' => SupportTicket::whereNull('user_id')
                ->whereNotNull('contact_email')
                ->whereIn('status', ['open', 'pending_admin'])
                ->count(),
        ];
    }

    private function payload(AdminActivityEvent $activity): array
    {
        return [
            'id' => $activity->id,
            'type' => $activity->type,
            'title' => $activity->title,
            'body' => $activity->body,
            'route' => $activity->route,
            'source_type' => $activity->source_type,
            'source_id' => $activity->source_id,
            'metadata' => $activity->metadata ?? [],
            'counts' => $activity->counts ?? [],
            'created_at' => $activity->created_at,
        ];
    }

    private function mediaNeedsReviewCount(): int
    {
        $reportedMediaIds = Report::query()
            ->where('target_type', 'media')
            ->whereIn('status', ['open', 'reviewing'])
            ->select('target_id');

        return Media::query()
            ->where(function ($query) use ($reportedMediaIds) {
                $query->whereIn('moderation_status', ['pending', 'scanning', 'manual_pending', 'flagged', 'failed'])
                    ->orWhereIn('id', $reportedMediaIds);
            })
            ->count();
    }
}
