<?php

namespace App\Services;

use App\Models\Media;
use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\Report;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ModerationCaseService
{
    public function __construct(private ReporterRiskService $reporterRiskService)
    {
    }

    public function adminIndex(User $admin, array $filters = [], int $perPage = 25): LengthAwarePaginator
    {
        $this->ensureAdmin($admin);

        $perPage = max(1, min($perPage, 100));
        $search = trim((string) ($filters['q'] ?? ''));

        $cases = ModerationCase::query()
            ->with(['subjectUser:id,name,username,email,role,moderation_status,strike_count,is_paused,banned_at', 'openedByUser:id,name,username,email', 'assignedAdmin:id,name,username,email'])
            ->withCount(['actions', 'appeals', 'strikes'])
            ->when(($filters['status'] ?? null), fn ($query, string $status) => $query->where('status', $status))
            ->when(($filters['source'] ?? null), fn ($query, string $source) => $query->where('source', $source))
            ->when(($filters['severity'] ?? null), fn ($query, string $severity) => $query->where('severity', $severity))
            ->when(($filters['target_type'] ?? null), fn ($query, string $targetType) => $query->where('target_type', $targetType))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($nested) use ($search) {
                    $nested->where('summary', 'like', "%{$search}%")
                        ->orWhere('target_type', 'like', "%{$search}%")
                        ->orWhereHas('subjectUser', fn ($user) => $user
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('username', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"));
                });
            })
            ->latest('opened_at')
            ->paginate($perPage);

        $cases->getCollection()->transform(fn (ModerationCase $case) => $this->caseSummaryPayload($case));

        return $cases;
    }

    public function adminShow(User $admin, ModerationCase $case): array
    {
        $this->ensureAdmin($admin);

        $case->load([
            'subjectUser:id,name,username,email,role,moderation_status,strike_count,is_paused,banned_at',
            'openedByUser:id,name,username,email',
            'assignedAdmin:id,name,username,email',
            'actions.user:id,name,username,email',
            'actions.admin:id,name,username,email',
            'strikes.issuedByUser:id,name,username,email',
            'strikes.revokedByUser:id,name,username,email',
            'appeals.user:id,name,username,email,moderation_status,strike_count',
            'appeals.reviewedByUser:id,name,username,email',
        ]);

        return array_merge($this->caseSummaryPayload($case), [
            'evidence' => $case->evidence,
            'reports' => $this->caseReports($case),
            'actions' => $case->actions
                ->sortByDesc('id')
                ->values()
                ->map(fn (ModerationAction $action) => $this->actionPayload($action))
                ->all(),
            'strikes' => $case->strikes
                ->sortByDesc('id')
                ->values()
                ->map(fn ($strike) => [
                    'id' => $strike->id,
                    'user_id' => $strike->user_id,
                    'strike_number' => $strike->strike_number,
                    'category' => $strike->category,
                    'severity' => $strike->severity,
                    'reason' => $strike->reason,
                    'active' => (bool) $strike->active,
                    'expires_at' => $strike->expires_at,
                    'revoked_at' => $strike->revoked_at,
                    'revocation_reason' => $strike->revocation_reason,
                    'created_at' => $strike->created_at,
                    'issued_by_user' => $this->userLite($strike->issuedByUser),
                    'revoked_by_user' => $this->userLite($strike->revokedByUser),
                ])
                ->all(),
            'appeals' => $case->appeals
                ->sortByDesc('submitted_at')
                ->values()
                ->map(fn ($appeal) => [
                    'id' => $appeal->id,
                    'user_id' => $appeal->user_id,
                    'action_id' => $appeal->action_id,
                    'status' => $appeal->status,
                    'appeal_text' => $appeal->appeal_text,
                    'decision_note' => $appeal->decision_note,
                    'submitted_at' => $appeal->submitted_at,
                    'reviewed_at' => $appeal->reviewed_at,
                    'user' => $this->userLite($appeal->user),
                    'reviewed_by_user' => $this->userLite($appeal->reviewedByUser),
                ])
                ->all(),
        ]);
    }

    public function updateStatus(User $admin, ModerationCase $case, string $status, ?string $note = null): array
    {
        $this->ensureAdmin($admin);

        $note = trim((string) $note);
        $terminalStatuses = [
            ModerationCase::STATUS_ACTIONED,
            ModerationCase::STATUS_DISMISSED,
            ModerationCase::STATUS_CLOSED,
        ];

        if (! in_array($status, [
            ModerationCase::STATUS_UNDER_REVIEW,
            ModerationCase::STATUS_ACTIONED,
            ModerationCase::STATUS_DISMISSED,
            ModerationCase::STATUS_CLOSED,
        ], true)) {
            throw new HttpException(422, 'Invalid moderation case status.');
        }

        if (in_array($status, $terminalStatuses, true) && $note === '') {
            throw new HttpException(422, 'A decision note is required to close or resolve a case.');
        }

        DB::transaction(function () use ($admin, $case, $note, $status, $terminalStatuses) {
            $case->update([
                'assigned_admin_id' => $admin->id,
                'status' => $status,
                'closed_at' => in_array($status, $terminalStatuses, true) ? now() : null,
            ]);

            $this->syncLinkedReportsForCaseStatus($case->fresh(), $admin, $status, $note);

            $this->recordAction(
                $case,
                $case->subject_user_id,
                $case->target_type,
                (int) $case->target_id,
                $admin->id,
                $this->actionForCaseStatus($status),
                $note !== '' ? $note : null,
                ['case_status' => $status]
            );
        });

        return $this->adminShow($admin, $case->fresh());
    }

    public function createFromReport(Report $report): ModerationCase
    {
        $case = $this->findOpenCase(
            ModerationCase::SOURCE_REPORT,
            $report->target_type,
            (int) $report->target_id
        );

        $evidence = $this->mergeReportEvidence($case?->evidence ?? [], $report);
        $severity = $this->severityForReport($report);

        if ($case === null) {
            return ModerationCase::create([
                'subject_user_id' => $report->reported_user_id,
                'opened_by_user_id' => $report->reporter_id,
                'source' => ModerationCase::SOURCE_REPORT,
                'target_type' => $report->target_type,
                'target_id' => $report->target_id,
                'severity' => $severity,
                'status' => ModerationCase::STATUS_OPEN,
                'summary' => 'User report: '.$report->reason,
                'evidence' => $evidence,
                'opened_at' => now(),
            ]);
        }

        $case->update([
            'subject_user_id' => $case->subject_user_id ?? $report->reported_user_id,
            'severity' => $this->maxSeverity($case->severity, $severity),
            'status' => ModerationCase::STATUS_OPEN,
            'summary' => 'User reports: '.Arr::get($evidence, 'report_count', 1).' open report(s)',
            'evidence' => $evidence,
            'closed_at' => null,
        ]);

        return $case->fresh();
    }

    public function recordReportReview(Report $report, User $admin): ?ModerationAction
    {
        $case = $this->findOpenOrRecentCase(
            ModerationCase::SOURCE_REPORT,
            $report->target_type,
            (int) $report->target_id
        );

        if ($case === null) {
            return null;
        }

        $caseStatus = $this->caseStatusForReport($report);
        $case->update([
            'status' => $caseStatus,
            'assigned_admin_id' => $admin->id,
            'closed_at' => in_array($caseStatus, [ModerationCase::STATUS_ACTIONED, ModerationCase::STATUS_DISMISSED], true)
                ? now()
                : null,
        ]);

        $action = $this->actionForReport($report);
        if ($action === null) {
            return null;
        }

        return $this->recordAction(
            $case,
            $report->reported_user_id,
            $report->target_type,
            (int) $report->target_id,
            $admin->id,
            $action,
            $report->action_note,
            [
                'report_id' => $report->id,
                'report_status' => $report->status,
                'report_action' => $report->action,
            ]
        );
    }

    public function createFromMediaModeration(
        Media $media,
        string $event,
        string $summary,
        array $extraEvidence = []
    ): ModerationCase {
        $case = $this->findOpenCase(
            ModerationCase::SOURCE_AI_MEDIA,
            'media',
            (int) $media->id
        );

        $evidence = array_merge([
            'media_id' => $media->id,
            'media_type' => $media->type,
            'mime_type' => $media->mime_type,
            'moderation_status' => $media->moderation_status,
            'moderation_labels' => $media->moderation_labels,
            'rekognition_job_id' => $media->rekognition_job_id,
            'event' => $event,
        ], $extraEvidence);

        if ($case === null) {
            return ModerationCase::create([
                'subject_user_id' => $media->user_id,
                'source' => ModerationCase::SOURCE_AI_MEDIA,
                'target_type' => 'media',
                'target_id' => $media->id,
                'severity' => $media->moderation_status === 'flagged'
                    ? ModerationCase::SEVERITY_HIGH
                    : ModerationCase::SEVERITY_MEDIUM,
                'status' => ModerationCase::STATUS_OPEN,
                'summary' => $summary,
                'evidence' => $evidence,
                'opened_at' => now(),
            ]);
        }

        $case->update([
            'subject_user_id' => $case->subject_user_id ?? $media->user_id,
            'severity' => $media->moderation_status === 'flagged'
                ? $this->maxSeverity($case->severity, ModerationCase::SEVERITY_HIGH)
                : $case->severity,
            'status' => ModerationCase::STATUS_OPEN,
            'summary' => $summary,
            'evidence' => array_merge($case->evidence ?? [], $evidence),
            'closed_at' => null,
        ]);

        return $case->fresh();
    }

    public function recordAction(
        ?ModerationCase $case,
        ?int $userId,
        ?string $targetType,
        ?int $targetId,
        ?int $adminId,
        string $action,
        ?string $reason = null,
        array $metadata = []
    ): ModerationAction {
        return ModerationAction::create([
            'case_id' => $case?->id,
            'user_id' => $userId,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'admin_id' => $adminId,
            'action' => $action,
            'reason' => $reason,
            'metadata' => $metadata,
        ]);
    }

    private function findOpenCase(string $source, string $targetType, int $targetId): ?ModerationCase
    {
        return ModerationCase::query()
            ->where('source', $source)
            ->where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->whereIn('status', [
                ModerationCase::STATUS_OPEN,
                ModerationCase::STATUS_UNDER_REVIEW,
            ])
            ->latest('opened_at')
            ->first();
    }

    private function findOpenOrRecentCase(string $source, string $targetType, int $targetId): ?ModerationCase
    {
        return ModerationCase::query()
            ->where('source', $source)
            ->where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->latest('opened_at')
            ->first();
    }

    private function mergeReportEvidence(array $evidence, Report $report): array
    {
        $reportIds = collect($evidence['report_ids'] ?? [])
            ->push($report->id)
            ->filter()
            ->unique()
            ->values()
            ->all();

        return array_merge($evidence, [
            'report_ids' => $reportIds,
            'latest_report_id' => $report->id,
            'report_count' => count($reportIds),
            'latest_reason' => $report->reason,
            'latest_details' => $report->details,
            'latest_reporter_id' => $report->reporter_id,
        ]);
    }

    private function severityForReport(Report $report): string
    {
        $text = strtolower($report->reason.' '.$report->details);
        if (str_contains($text, 'underage')
            || str_contains($text, 'child')
            || str_contains($text, 'trafficking')
            || str_contains($text, 'revenge')
            || str_contains($text, 'non-consensual')
            || str_contains($text, 'illegal')) {
            return ModerationCase::SEVERITY_CRITICAL;
        }
        if (str_contains($text, 'violence')
            || str_contains($text, 'threat')
            || str_contains($text, 'harassment')
            || str_contains($text, 'abuse')
            || str_contains($text, 'hate')
            || str_contains($text, 'scam')
            || str_contains($text, 'fraud')
            || str_contains($text, 'impersonation')
            || str_contains($text, 'explicit')
            || str_contains($text, 'unsafe')) {
            return ModerationCase::SEVERITY_HIGH;
        }

        return ModerationCase::SEVERITY_MEDIUM;
    }

    private function maxSeverity(string $current, string $incoming): string
    {
        $rank = [
            ModerationCase::SEVERITY_LOW => 1,
            ModerationCase::SEVERITY_MEDIUM => 2,
            ModerationCase::SEVERITY_HIGH => 3,
            ModerationCase::SEVERITY_CRITICAL => 4,
        ];

        return ($rank[$incoming] ?? 0) > ($rank[$current] ?? 0) ? $incoming : $current;
    }

    private function caseStatusForReport(Report $report): string
    {
        return match ($report->status) {
            'reviewing' => ModerationCase::STATUS_UNDER_REVIEW,
            'resolved' => $report->action && $report->action !== 'none'
                ? ModerationCase::STATUS_ACTIONED
                : ModerationCase::STATUS_DISMISSED,
            'dismissed' => ModerationCase::STATUS_DISMISSED,
            default => ModerationCase::STATUS_OPEN,
        };
    }

    private function actionForReport(Report $report): ?string
    {
        if (! in_array($report->status, ['resolved', 'dismissed'], true) && $report->action === null) {
            return null;
        }

        return match ($report->action) {
            'hide_content', 'delete_media' => ModerationAction::ACTION_HIDE_CONTENT,
            'suspend_user' => ModerationAction::ACTION_TEMPORARY_SUSPENSION,
            default => ModerationAction::ACTION_NO_ACTION,
        };
    }

    private function actionForCaseStatus(string $status): string
    {
        return match ($status) {
            ModerationCase::STATUS_UNDER_REVIEW => ModerationAction::ACTION_CASE_UNDER_REVIEW,
            ModerationCase::STATUS_ACTIONED => ModerationAction::ACTION_CASE_ACTIONED,
            ModerationCase::STATUS_DISMISSED => ModerationAction::ACTION_CASE_DISMISSED,
            ModerationCase::STATUS_CLOSED => ModerationAction::ACTION_CASE_CLOSED,
            default => ModerationAction::ACTION_NO_ACTION,
        };
    }

    private function syncLinkedReportsForCaseStatus(
        ModerationCase $case,
        User $admin,
        string $caseStatus,
        string $note
    ): void {
        $reportIds = $this->reportIdsForCase($case);
        if ($reportIds === []) {
            return;
        }

        $reportStatus = match ($caseStatus) {
            ModerationCase::STATUS_UNDER_REVIEW => 'reviewing',
            ModerationCase::STATUS_DISMISSED => 'dismissed',
            default => 'resolved',
        };

        Report::query()
            ->whereIn('id', $reportIds)
            ->update([
                'status' => $reportStatus,
                'action' => $caseStatus === ModerationCase::STATUS_UNDER_REVIEW ? null : 'none',
                'action_note' => $note !== '' ? $note : null,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);

        Report::query()
            ->whereIn('id', $reportIds)
            ->get()
            ->each(fn (Report $report) => $this->reporterRiskService->applyReviewOutcome($report));
    }

    private function caseSummaryPayload(ModerationCase $case): array
    {
        return [
            'id' => $case->id,
            'subject_user_id' => $case->subject_user_id,
            'opened_by_user_id' => $case->opened_by_user_id,
            'assigned_admin_id' => $case->assigned_admin_id,
            'source' => $case->source,
            'target_type' => $case->target_type,
            'target_id' => $case->target_id,
            'severity' => $case->severity,
            'status' => $case->status,
            'summary' => $case->summary,
            'opened_at' => $case->opened_at,
            'closed_at' => $case->closed_at,
            'created_at' => $case->created_at,
            'subject_user' => $this->userLite($case->subjectUser),
            'opened_by_user' => $this->userLite($case->openedByUser),
            'assigned_admin' => $this->userLite($case->assignedAdmin),
            'reports_count' => count($this->reportIdsForCase($case)),
            'actions_count' => (int) ($case->actions_count ?? $case->actions()->count()),
            'appeals_count' => (int) ($case->appeals_count ?? $case->appeals()->count()),
            'strikes_count' => (int) ($case->strikes_count ?? $case->strikes()->count()),
        ];
    }

    private function actionPayload(ModerationAction $action): array
    {
        return [
            'id' => $action->id,
            'user_id' => $action->user_id,
            'target_type' => $action->target_type,
            'target_id' => $action->target_id,
            'admin_id' => $action->admin_id,
            'action' => $action->action,
            'reason' => $action->reason,
            'metadata' => $action->metadata,
            'created_at' => $action->created_at,
            'user' => $this->userLite($action->user),
            'admin' => $this->userLite($action->admin),
        ];
    }

    private function caseReports(ModerationCase $case): array
    {
        $reportIds = $this->reportIdsForCase($case);
        if ($reportIds === []) {
            return [];
        }

        return Report::query()
            ->with(['reporter:id,name,username,email', 'reportedUser:id,name,username,email', 'reviewer:id,name,username,email'])
            ->whereIn('id', $reportIds)
            ->latest()
            ->get()
            ->map(fn (Report $report) => [
                'id' => $report->id,
                'target_type' => $report->target_type,
                'target_id' => $report->target_id,
                'reason' => $report->reason,
                'details' => $report->details,
                'status' => $report->status,
                'action' => $report->action,
                'action_note' => $report->action_note,
                'created_at' => $report->created_at,
                'reviewed_at' => $report->reviewed_at,
                'reporter' => $this->userLite($report->reporter),
                'reported_user' => $this->userLite($report->reportedUser),
                'reviewer' => $this->userLite($report->reviewer),
            ])
            ->all();
    }

    private function reportIdsForCase(ModerationCase $case): array
    {
        $evidence = $case->evidence ?? [];

        return collect($evidence['report_ids'] ?? [])
            ->push($evidence['latest_report_id'] ?? null)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function userLite(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'moderation_status' => $user->moderation_status,
            'strike_count' => $user->strike_count,
            'is_paused' => $user->is_paused,
            'banned_at' => $user->banned_at,
        ];
    }

    private function ensureAdmin(?User $user): void
    {
        if (! $user || $user->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }
    }
}
