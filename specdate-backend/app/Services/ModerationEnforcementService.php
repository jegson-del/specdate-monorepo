<?php

namespace App\Services;

use App\Models\ModerationAction;
use App\Models\ModerationCase;
use App\Models\ModerationStrike;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ModerationEnforcementService
{
    public function __construct(private ModerationCaseService $moderationCases)
    {
    }

    public function applyStrikeOutcome(ModerationStrike $strike, ?User $admin = null): array
    {
        $strike->loadMissing(['user', 'case']);
        $user = $strike->user;
        if (! $user) {
            throw new HttpException(422, 'Strike has no subject user.');
        }

        if ($this->shouldImmediatelyBan($strike)) {
            return $this->permanentlyBan(
                $strike->case,
                $user,
                $admin,
                $strike->reason,
                ['strike_id' => $strike->id, 'strike_number' => $strike->strike_number, 'immediate' => true]
            );
        }

        $activeStrikeCount = $this->activeStrikeCount($user);
        if ($activeStrikeCount >= 3) {
            return $this->permanentlyBan(
                $strike->case,
                $user,
                $admin,
                $strike->reason,
                ['strike_id' => $strike->id, 'strike_number' => $strike->strike_number]
            );
        }
        if ($activeStrikeCount === 2) {
            return $this->temporarilySuspend(
                $strike->case,
                $user,
                $admin,
                $strike->reason,
                now()->addDays($this->suspensionDaysFor($strike)),
                ['strike_id' => $strike->id, 'strike_number' => $strike->strike_number]
            );
        }

        return $this->warn(
            $strike->case,
            $user,
            $admin,
            $strike->reason,
            ['strike_id' => $strike->id, 'strike_number' => $strike->strike_number]
        );
    }

    public function warn(?ModerationCase $case, User $user, ?User $admin, string $reason, array $metadata = []): array
    {
        return DB::transaction(function () use ($case, $user, $admin, $reason, $metadata) {
            if (! $user->banned_at && ! $user->is_paused) {
                $user->forceFill(['moderation_status' => 'warned'])->save();
            }

            $action = $this->moderationCases->recordAction(
                $case,
                $user->id,
                $case?->target_type,
                $case?->target_id,
                $admin?->id,
                ModerationAction::ACTION_WARNING,
                trim($reason),
                $metadata
            );

            return $this->payload($user->fresh(), $action->fresh());
        });
    }

    public function temporarilySuspend(
        ?ModerationCase $case,
        User $user,
        ?User $admin,
        string $reason,
        ?CarbonInterface $until = null,
        array $metadata = []
    ): array {
        return DB::transaction(function () use ($case, $user, $admin, $reason, $until, $metadata) {
            $until ??= now()->addDays(3);
            $user->forceFill([
                'is_paused' => true,
                'suspended_until' => $until,
                'moderation_status' => 'suspended',
            ])->save();

            $action = $this->moderationCases->recordAction(
                $case,
                $user->id,
                $case?->target_type,
                $case?->target_id,
                $admin?->id,
                ModerationAction::ACTION_TEMPORARY_SUSPENSION,
                trim($reason),
                array_merge($metadata, ['suspended_until' => $until->toISOString()])
            );

            return $this->payload($user->fresh(), $action->fresh());
        });
    }

    public function permanentlyBan(?ModerationCase $case, User $user, ?User $admin, string $reason, array $metadata = []): array
    {
        return DB::transaction(function () use ($case, $user, $admin, $reason, $metadata) {
            $user->forceFill([
                'banned_at' => now(),
                'ban_reason' => trim($reason),
                'banned_by' => $admin?->id,
                'is_paused' => true,
                'moderation_status' => 'permanently_banned',
            ])->save();
            $user->tokens()->delete();

            $action = $this->moderationCases->recordAction(
                $case,
                $user->id,
                $case?->target_type,
                $case?->target_id,
                $admin?->id,
                ModerationAction::ACTION_PERMANENT_BAN,
                trim($reason),
                $metadata
            );

            return $this->payload($user->fresh(), $action->fresh());
        });
    }

    private function activeStrikeCount(User $user): int
    {
        return ModerationStrike::query()
            ->where('user_id', $user->id)
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->count();
    }

    private function shouldImmediatelyBan(ModerationStrike $strike): bool
    {
        return $strike->category === ModerationStrike::CATEGORY_SCAM
            && $strike->severity === ModerationStrike::SEVERITY_HIGH;
    }

    private function suspensionDaysFor(ModerationStrike $strike): int
    {
        return $strike->severity === ModerationStrike::SEVERITY_HIGH ? 7 : 3;
    }

    private function payload(User $user, ModerationAction $action): array
    {
        return [
            'user' => [
                'id' => $user->id,
                'moderation_status' => $user->moderation_status,
                'strike_count' => (int) $user->strike_count,
                'is_paused' => (bool) $user->is_paused,
                'suspended_until' => $user->suspended_until,
                'banned_at' => $user->banned_at,
                'ban_reason' => $user->ban_reason,
            ],
            'action' => [
                'id' => $action->id,
                'action' => $action->action,
                'reason' => $action->reason,
                'metadata' => $action->metadata,
            ],
        ];
    }
}
