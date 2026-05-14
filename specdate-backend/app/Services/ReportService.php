<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\DatePartnerReview;
use App\Models\Media;
use App\Models\ProviderProfile;
use App\Models\ProviderReview;
use App\Models\Report;
use App\Models\Spec;
use App\Models\SpecRoundAnswer;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ReportService
{
    public function __construct(
        private MediaService $mediaService,
        private ModerationCaseService $moderationCaseService,
    )
    {
    }

    public function create(User $reporter, array $data): Report
    {
        $targetType = $data['target_type'];
        $targetId = (int) $data['target_id'];
        $target = $this->resolveTarget($targetType, $targetId);
        $reportedUserId = $this->reportedUserIdFor($targetType, $target);

        if ($reportedUserId && (int) $reportedUserId === (int) $reporter->id) {
            throw new HttpException(422, 'You cannot report your own content.');
        }

        return DB::transaction(function () use ($reporter, $reportedUserId, $targetType, $targetId, $data) {
            $report = Report::create([
                'reporter_id' => $reporter->id,
                'reported_user_id' => $reportedUserId,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'reason' => $data['reason'],
                'details' => $data['details'] ?? null,
                'status' => 'open',
            ]);

            $this->moderationCaseService->createFromReport($report);

            return $report;
        });
    }

    public function review(User $admin, Report $report, array $data): Report
    {
        if ($admin->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }

        $status = $data['status'] ?? $report->status;
        $action = $data['action'] ?? null;

        DB::transaction(function () use ($report, $status, $action, $data, $admin) {
            if ($action && $action !== 'none') {
                $this->applyAction($report, $action, $data['action_note'] ?? null);
            }

            $report->update([
                'status' => $status,
                'action' => $action ?: $report->action,
                'action_note' => $data['action_note'] ?? $report->action_note,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);

            $this->moderationCaseService->recordReportReview($report->fresh(), $admin);
        });

        return $report->fresh(['reporter:id,name,username', 'reportedUser:id,name,username', 'reviewer:id,name,username']);
    }

    private function resolveTarget(string $targetType, int $targetId): Model
    {
        return match ($targetType) {
            'user', 'profile' => User::findOrFail($targetId),
            'provider_profile' => ProviderProfile::findOrFail($targetId),
            'provider_review' => ProviderReview::findOrFail($targetId),
            'date_partner_review' => DatePartnerReview::findOrFail($targetId),
            'message' => ChatMessage::findOrFail($targetId),
            'media' => Media::findOrFail($targetId),
            'spec' => Spec::findOrFail($targetId),
            'round_answer' => SpecRoundAnswer::findOrFail($targetId),
            default => throw new HttpException(422, 'Invalid report target.'),
        };
    }

    private function reportedUserIdFor(string $targetType, Model $target): ?int
    {
        return match ($targetType) {
            'user', 'profile' => (int) $target->id,
            'provider_profile' => (int) $target->user_id,
            'provider_review', 'date_partner_review' => (int) $target->reviewer_id,
            'message' => (int) $target->sender_id,
            'media' => (int) $target->user_id,
            'spec' => (int) $target->user_id,
            'round_answer' => (int) $target->user_id,
            default => null,
        };
    }

    private function applyAction(Report $report, string $action, ?string $note = null): void
    {
        $target = $this->resolveTarget($report->target_type, (int) $report->target_id);
        $reason = $note ?: 'Moderation action';

        if ($action === 'suspend_user') {
            if ($report->reported_user_id) {
                User::where('id', $report->reported_user_id)->update(['is_paused' => true]);
            }
            return;
        }

        if ($action === 'delete_media' && $target instanceof Media) {
            $this->mediaService->deleteMedia($target);
            return;
        }

        if ($action === 'hide_content') {
            if (in_array($report->target_type, ['message', 'media', 'round_answer'], true)) {
                $target->update(['hidden_at' => now(), 'hidden_reason' => $reason]);
            }
            if ($report->target_type === 'profile' && $report->reported_user_id) {
                User::where('id', $report->reported_user_id)->update(['is_paused' => true]);
            }
        }
    }
}
