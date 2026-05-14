<?php

namespace App\Services;

use App\Models\ModerationAction;
use App\Models\ModerationAppeal;
use App\Models\ModerationCase;
use App\Models\ModerationStrike;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AppealService
{
    private const APPEALABLE_ACTIONS = [
        ModerationAction::ACTION_WARNING,
        ModerationAction::ACTION_STRIKE,
        ModerationAction::ACTION_TEMPORARY_SUSPENSION,
        ModerationAction::ACTION_PERMANENT_BAN,
    ];

    public function __construct(
        private ModerationCaseService $moderationCases,
        private StrikeService $strikes,
    )
    {
    }

    public function moderationStatus(User $user): array
    {
        $activeAppeals = ModerationAppeal::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ModerationAppeal::ACTIVE_STATUSES)
            ->latest('submitted_at')
            ->get()
            ->map(fn (ModerationAppeal $appeal) => $this->appealPayload($appeal))
            ->all();

        $appealableActions = ModerationAction::query()
            ->with('case')
            ->where('user_id', $user->id)
            ->whereIn('action', self::APPEALABLE_ACTIONS)
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (ModerationAction $action) => $this->actionPayload($action))
            ->all();

        $activeStrikes = ModerationStrike::query()
            ->where('user_id', $user->id)
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->latest()
            ->get()
            ->map(fn (ModerationStrike $strike) => $this->strikePayload($strike))
            ->all();

        return [
            'user' => $this->userModerationPayload($user->fresh()),
            'active_strikes' => $activeStrikes,
            'active_appeals' => $activeAppeals,
            'appealable_actions' => $appealableActions,
        ];
    }

    public function submit(User $user, array $data): array
    {
        $action = isset($data['action_id'])
            ? ModerationAction::query()->with('case')->findOrFail((int) $data['action_id'])
            : null;
        $case = isset($data['case_id'])
            ? ModerationCase::query()->findOrFail((int) $data['case_id'])
            : $action?->case;

        if (! $action && ! $case) {
            throw new HttpException(422, 'A moderation case or action is required.');
        }
        if ($action && (int) $action->user_id !== (int) $user->id) {
            throw new HttpException(403, 'You can only appeal actions on your own account.');
        }
        if ($action && ! in_array($action->action, self::APPEALABLE_ACTIONS, true)) {
            throw new HttpException(422, 'This moderation action cannot be appealed.');
        }
        if ($case && (int) $case->subject_user_id !== (int) $user->id) {
            throw new HttpException(403, 'You can only appeal moderation cases on your own account.');
        }

        $duplicate = ModerationAppeal::query()
            ->where('user_id', $user->id)
            ->whereIn('status', ModerationAppeal::ACTIVE_STATUSES)
            ->when($action, fn ($query) => $query->where('action_id', $action->id))
            ->when(! $action && $case, fn ($query) => $query->where('case_id', $case->id))
            ->exists();

        if ($duplicate) {
            throw new HttpException(422, 'An open appeal already exists for this moderation item.');
        }

        $appeal = ModerationAppeal::create([
            'user_id' => $user->id,
            'case_id' => $case?->id,
            'action_id' => $action?->id,
            'status' => ModerationAppeal::STATUS_OPEN,
            'appeal_text' => trim($data['appeal_text']),
            'submitted_at' => now(),
        ]);

        if ($case && $case->status !== ModerationCase::STATUS_APPEALED) {
            $case->update(['status' => ModerationCase::STATUS_APPEALED]);
        }

        return $this->appealPayload($appeal->fresh(['case', 'action']));
    }

    public function index(User $admin, array $filters = [], int $perPage = 20): LengthAwarePaginator
    {
        $this->ensureAdmin($admin);

        return ModerationAppeal::query()
            ->with(['user:id,name,username,email,role,moderation_status,strike_count,is_paused,suspended_until,banned_at', 'case', 'action', 'reviewedByUser:id,name,username,email'])
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->latest('submitted_at')
            ->paginate($perPage);
    }

    public function decide(User $admin, ModerationAppeal $appeal, array $data): array
    {
        $this->ensureAdmin($admin);
        if (! in_array($appeal->status, ModerationAppeal::ACTIVE_STATUSES, true)) {
            throw new HttpException(422, 'This appeal has already been decided.');
        }

        return DB::transaction(function () use ($admin, $appeal, $data) {
            $status = $data['status'];
            $note = trim($data['decision_note']);

            $appeal->loadMissing(['case', 'action', 'user']);
            $appeal->update([
                'status' => $status,
                'reviewed_by_user_id' => $admin->id,
                'decision_note' => $note,
                'reviewed_at' => now(),
            ]);

            $result = null;
            if ($status === ModerationAppeal::STATUS_GRANTED) {
                $result = $this->applyGrant($admin, $appeal, $note);
            }

            $this->moderationCases->recordAction(
                $appeal->case,
                $appeal->user_id,
                $appeal->case?->target_type ?? $appeal->action?->target_type,
                $appeal->case?->target_id ?? $appeal->action?->target_id,
                $admin->id,
                $status === ModerationAppeal::STATUS_GRANTED
                    ? ModerationAction::ACTION_APPEAL_GRANTED
                    : ModerationAction::ACTION_APPEAL_DENIED,
                $note,
                [
                    'appeal_id' => $appeal->id,
                    'action_id' => $appeal->action_id,
                    'case_id' => $appeal->case_id,
                    'reversal' => $result,
                ]
            );

            return array_merge($this->appealPayload($appeal->fresh(['case', 'action', 'user', 'reviewedByUser'])), [
                'result' => $result,
            ]);
        });
    }

    private function applyGrant(User $admin, ModerationAppeal $appeal, string $note): ?array
    {
        $action = $appeal->action;
        $user = $appeal->user;
        if (! $action || ! $user) {
            return null;
        }

        if ($action->action === ModerationAction::ACTION_STRIKE) {
            return $this->reverseStrikeAction($admin, $appeal, $note);
        }
        if ($action->action === ModerationAction::ACTION_TEMPORARY_SUSPENSION) {
            return $this->clearSuspension($user, $note);
        }
        if ($action->action === ModerationAction::ACTION_PERMANENT_BAN) {
            return $this->clearBan($user, $note);
        }

        return null;
    }

    private function reverseStrikeAction(User $admin, ModerationAppeal $appeal, string $note): ?array
    {
        $strikeId = (int) ($appeal->action?->metadata['strike_id'] ?? 0);
        if ($strikeId <= 0) {
            throw new HttpException(422, 'The appealed strike action is missing strike metadata.');
        }

        $strike = ModerationStrike::query()->findOrFail($strikeId);
        if ((int) $strike->user_id !== (int) $appeal->user_id) {
            throw new HttpException(422, 'The appealed strike does not belong to this user.');
        }

        $user = $appeal->user;
        $this->clearRelatedEnforcementForStrike($user, $strike->id);
        $payload = $this->strikes->revoke($admin, $strike, $note);

        return [
            'type' => 'strike_revoked',
            'strike' => $payload,
        ];
    }

    private function clearRelatedEnforcementForStrike(User $user, int $strikeId): void
    {
        $relatedActions = ModerationAction::query()
            ->where('user_id', $user->id)
            ->whereIn('action', [
                ModerationAction::ACTION_TEMPORARY_SUSPENSION,
                ModerationAction::ACTION_PERMANENT_BAN,
            ])
            ->where('metadata->strike_id', $strikeId)
            ->pluck('action')
            ->all();

        if (in_array(ModerationAction::ACTION_PERMANENT_BAN, $relatedActions, true)) {
            $user->forceFill([
                'banned_at' => null,
                'ban_reason' => null,
                'banned_by' => null,
                'is_paused' => false,
            ])->save();
        }

        if (in_array(ModerationAction::ACTION_TEMPORARY_SUSPENSION, $relatedActions, true)) {
            $user->forceFill([
                'is_paused' => false,
                'suspended_until' => null,
            ])->save();
        }
    }

    private function clearSuspension(User $user, string $note): array
    {
        $user->forceFill([
            'is_paused' => false,
            'suspended_until' => null,
        ])->save();

        $user = $this->strikes->refreshUserStrikeFields($user);

        return [
            'type' => 'suspension_cleared',
            'reason' => $note,
            'user' => $this->userModerationPayload($user),
        ];
    }

    private function clearBan(User $user, string $note): array
    {
        $user->forceFill([
            'banned_at' => null,
            'ban_reason' => null,
            'banned_by' => null,
            'is_paused' => false,
        ])->save();

        $user = $this->strikes->refreshUserStrikeFields($user);

        return [
            'type' => 'ban_cleared',
            'reason' => $note,
            'user' => $this->userModerationPayload($user),
        ];
    }

    private function appealPayload(ModerationAppeal $appeal): array
    {
        return [
            'id' => $appeal->id,
            'user_id' => $appeal->user_id,
            'case_id' => $appeal->case_id,
            'action_id' => $appeal->action_id,
            'status' => $appeal->status,
            'appeal_text' => $appeal->appeal_text,
            'decision_note' => $appeal->decision_note,
            'reviewed_by_user_id' => $appeal->reviewed_by_user_id,
            'submitted_at' => $appeal->submitted_at,
            'reviewed_at' => $appeal->reviewed_at,
            'action' => $appeal->relationLoaded('action') && $appeal->action
                ? $this->actionPayload($appeal->action)
                : null,
        ];
    }

    private function actionPayload(ModerationAction $action): array
    {
        return [
            'id' => $action->id,
            'case_id' => $action->case_id,
            'action' => $action->action,
            'reason' => $action->reason,
            'metadata' => $action->metadata,
            'created_at' => $action->created_at,
        ];
    }

    private function strikePayload(ModerationStrike $strike): array
    {
        return [
            'id' => $strike->id,
            'case_id' => $strike->case_id,
            'strike_number' => $strike->strike_number,
            'category' => $strike->category,
            'severity' => $strike->severity,
            'reason' => $strike->reason,
            'active' => (bool) $strike->active,
            'expires_at' => $strike->expires_at,
            'created_at' => $strike->created_at,
        ];
    }

    private function userModerationPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'moderation_status' => $user->moderation_status,
            'strike_count' => (int) $user->strike_count,
            'risk_score' => (int) $user->risk_score,
            'last_violation_at' => $user->last_violation_at,
            'is_paused' => (bool) $user->is_paused,
            'suspended_until' => $user->suspended_until,
            'banned_at' => $user->banned_at,
            'ban_reason' => $user->ban_reason,
        ];
    }

    private function ensureAdmin(?User $user): void
    {
        if (! $user || $user->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }
    }
}
