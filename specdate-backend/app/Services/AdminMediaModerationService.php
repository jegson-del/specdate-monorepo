<?php

namespace App\Services;

use App\Models\Media;
use App\Models\Report;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminMediaModerationService
{
    private const REVIEW_STATUSES = ['pending', 'scanning', 'manual_pending', 'flagged', 'failed'];

    public function index(User $admin, ?string $status = null, int $perPage = 25): LengthAwarePaginator
    {
        $this->ensureAdmin($admin);

        $status = $status ?: 'needs_review';
        $perPage = max(1, min($perPage, 100));
        $openMediaReportIds = Report::query()
            ->where('target_type', 'media')
            ->whereIn('status', ['open', 'reviewing'])
            ->select('target_id');

        $media = Media::query()
            ->with('user:id,name,username,email')
            ->withCount([
                'reports as reports_count',
                'reports as open_reports_count' => fn ($query) => $query->whereIn('status', ['open', 'reviewing']),
            ])
            ->when($status === 'needs_review', function ($query) use ($openMediaReportIds) {
                $query->where(function ($nested) use ($openMediaReportIds) {
                    $nested->whereIn('moderation_status', self::REVIEW_STATUSES)
                        ->orWhereIn('id', $openMediaReportIds);
                });
            })
            ->when($status === 'reported', fn ($query) => $query->whereIn('id', $openMediaReportIds))
            ->when($status === 'stale', fn ($query) => $query
                ->whereIn('moderation_status', ['pending', 'scanning'])
                ->where('created_at', '<=', now()->subMinutes(15)))
            ->when(
                in_array($status, ['pending', 'scanning', 'manual_pending', 'flagged', 'failed', 'approved'], true),
                fn ($query) => $query->where('moderation_status', $status)
            )
            ->when($status === 'hidden', fn ($query) => $query->whereNotNull('hidden_at'))
            ->latest()
            ->paginate($perPage);

        $reportsByMediaId = $this->recentReportsFor($media->getCollection()->pluck('id'));

        $media->getCollection()->transform(
            fn (Media $item) => $this->payload($item, $reportsByMediaId->get($item->id, collect()))
        );

        return $media;
    }

    public function approve(User $admin, Media $media): array
    {
        $this->ensureAdmin($admin);

        if ($media->hidden_at !== null) {
            throw new HttpException(422, 'Hidden media must be restored through a moderation action before approval.');
        }

        $labels = is_array($media->moderation_labels) ? $media->moderation_labels : [];
        $labels['admin_override'] = [
            'action' => 'approved',
            'admin_id' => $admin->id,
            'at' => now()->toIso8601String(),
        ];

        $media->update([
            'moderation_status' => 'approved',
            'moderation_labels' => $labels,
            'moderation_error' => null,
            'moderation_checked_at' => now(),
        ]);

        return $this->payload(
            $media->fresh(['user:id,name,username,email']),
            $this->recentReportsFor(collect([$media->id]))->get($media->id, collect())
        );
    }

    private function ensureAdmin(?User $user): void
    {
        if (! $user || $user->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }
    }

    /**
     * @param  Collection<int, int>  $mediaIds
     * @return Collection<int, Collection<int, Report>>
     */
    private function recentReportsFor(Collection $mediaIds): Collection
    {
        if ($mediaIds->isEmpty()) {
            return collect();
        }

        return Report::query()
            ->with('reporter:id,name,username')
            ->where('target_type', 'media')
            ->whereIn('target_id', $mediaIds->values())
            ->latest()
            ->get()
            ->groupBy('target_id');
    }

    /**
     * @param  Collection<int, Report>  $reports
     */
    private function payload(Media $media, Collection $reports): array
    {
        return [
            'id' => $media->id,
            'user' => $media->user ? [
                'id' => $media->user->id,
                'name' => $media->user->name,
                'username' => $media->user->username,
                'email' => $media->user->email,
            ] : null,
            'url' => $media->url,
            'file_path' => $media->file_path,
            'type' => $media->type,
            'mime_type' => $media->mime_type,
            'size' => $media->size,
            'hidden_at' => optional($media->hidden_at)->toIso8601String(),
            'hidden_reason' => $media->hidden_reason,
            'moderation_status' => $media->moderation_status,
            'moderation_labels' => $media->moderation_labels,
            'rekognition_job_id' => $media->rekognition_job_id,
            'moderation_checked_at' => optional($media->moderation_checked_at)->toIso8601String(),
            'moderation_error' => $media->moderation_error,
            'reports_count' => (int) ($media->reports_count ?? $reports->count()),
            'open_reports_count' => (int) ($media->open_reports_count ?? $reports->whereIn('status', ['open', 'reviewing'])->count()),
            'reports' => $reports->take(5)->map(fn (Report $report) => [
                'id' => $report->id,
                'reason' => $report->reason,
                'details' => $report->details,
                'status' => $report->status,
                'created_at' => optional($report->created_at)->toIso8601String(),
                'reporter' => $report->reporter ? [
                    'id' => $report->reporter->id,
                    'name' => $report->reporter->name,
                    'username' => $report->reporter->username,
                ] : null,
            ])->values()->all(),
            'created_at' => optional($media->created_at)->toIso8601String(),
        ];
    }
}
