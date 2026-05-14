<?php

namespace App\Services;

use App\Models\Media;
use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\Report;
use App\Models\User;
use Illuminate\Support\Arr;

class ModerationCaseService
{
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
}
