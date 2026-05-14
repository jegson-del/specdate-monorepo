<?php

namespace App\Services;

use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\ModerationStrike;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class StrikeService
{
    public function __construct(
        private ModerationCaseService $moderationCases,
        private ModerationEnforcementService $enforcement,
    )
    {
    }

    public function issue(User $admin, ModerationCase $case, array $data): array
    {
        $this->ensureAdmin($admin);

        $userId = (int) ($data['user_id'] ?? $case->subject_user_id);
        if ($userId <= 0) {
            throw new HttpException(422, 'A subject user is required to issue a strike.');
        }
        if ((int) $admin->id === $userId) {
            throw new HttpException(422, 'Admins cannot issue strikes against their own account.');
        }

        $user = User::query()->findOrFail($userId);

        return DB::transaction(function () use ($admin, $case, $data, $user) {
            $strike = ModerationStrike::create([
                'user_id' => $user->id,
                'case_id' => $case->id,
                'report_id' => $data['report_id'] ?? null,
                'issued_by_user_id' => $admin->id,
                'strike_number' => $this->nextStrikeNumber($user),
                'category' => $data['category'],
                'severity' => $data['severity'],
                'reason' => trim($data['reason']),
                'evidence' => $data['evidence'] ?? null,
                'active' => true,
                'expires_at' => $data['expires_at'] ?? null,
            ]);

            $case->update([
                'assigned_admin_id' => $admin->id,
                'status' => ModerationCase::STATUS_ACTIONED,
                'closed_at' => now(),
            ]);

            $this->moderationCases->recordAction(
                $case,
                $user->id,
                $case->target_type,
                (int) $case->target_id,
                $admin->id,
                ModerationAction::ACTION_STRIKE,
                $strike->reason,
                [
                    'strike_id' => $strike->id,
                    'strike_number' => $strike->strike_number,
                    'category' => $strike->category,
                    'severity' => $strike->severity,
                    'report_id' => $strike->report_id,
                ]
            );

            $this->refreshUserStrikeFields($user);
            $outcome = $this->enforcement->applyStrikeOutcome($strike->fresh(['user', 'case']), $admin);

            return array_merge($this->strikePayload($strike->fresh(['user', 'case'])), [
                'enforcement' => $outcome['action'],
            ]);
        });
    }

    public function revoke(User $admin, ModerationStrike $strike, string $reason): array
    {
        $this->ensureAdmin($admin);
        if (! $strike->active) {
            throw new HttpException(422, 'Strike is already revoked.');
        }

        return DB::transaction(function () use ($admin, $strike, $reason) {
            $strike->update([
                'active' => false,
                'revoked_at' => now(),
                'revoked_by_user_id' => $admin->id,
                'revocation_reason' => trim($reason),
            ]);

            $this->moderationCases->recordAction(
                $strike->case,
                $strike->user_id,
                $strike->case?->target_type,
                $strike->case?->target_id,
                $admin->id,
                ModerationAction::ACTION_STRIKE_REVOKED,
                trim($reason),
                [
                    'strike_id' => $strike->id,
                    'strike_number' => $strike->strike_number,
                ]
            );

            $this->refreshUserStrikeFields($strike->user);

            return $this->strikePayload($strike->fresh(['user', 'case']));
        });
    }

    public function refreshUserStrikeFields(User $user): User
    {
        $activeStrikes = ModerationStrike::query()
            ->where('user_id', $user->id)
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });

        $count = (clone $activeStrikes)->count();
        $latestViolation = (clone $activeStrikes)->latest('created_at')->value('created_at');

        $user->forceFill([
            'strike_count' => $count,
            'last_violation_at' => $latestViolation,
            'moderation_status' => $this->moderationStatusFor($user, $count),
        ])->save();

        return $user->fresh();
    }

    private function nextStrikeNumber(User $user): int
    {
        return (int) ModerationStrike::query()
            ->where('user_id', $user->id)
            ->max('strike_number') + 1;
    }

    private function moderationStatusFor(User $user, int $activeStrikeCount): string
    {
        if ($user->banned_at) {
            return 'permanently_banned';
        }
        if ($user->suspended_until && $user->suspended_until->isFuture()) {
            return 'suspended';
        }
        if ($user->is_paused) {
            return 'suspended';
        }
        if ($activeStrikeCount > 0) {
            return 'warned';
        }

        return 'active';
    }

    private function strikePayload(ModerationStrike $strike): array
    {
        return [
            'id' => $strike->id,
            'user_id' => $strike->user_id,
            'case_id' => $strike->case_id,
            'report_id' => $strike->report_id,
            'issued_by_user_id' => $strike->issued_by_user_id,
            'strike_number' => $strike->strike_number,
            'category' => $strike->category,
            'severity' => $strike->severity,
            'reason' => $strike->reason,
            'evidence' => $strike->evidence,
            'active' => (bool) $strike->active,
            'expires_at' => $strike->expires_at,
            'revoked_at' => $strike->revoked_at,
            'revoked_by_user_id' => $strike->revoked_by_user_id,
            'revocation_reason' => $strike->revocation_reason,
            'created_at' => $strike->created_at,
            'user' => $strike->user ? [
                'id' => $strike->user->id,
                'name' => $strike->user->name,
                'username' => $strike->user->username,
                'moderation_status' => $strike->user->moderation_status,
                'strike_count' => $strike->user->strike_count,
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
