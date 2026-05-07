<?php

namespace App\Services;

use App\Models\BlockedUser;
use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

class BlockService
{
    public function block(User $user, int $blockedId, ?string $reason = null): BlockedUser
    {
        if ((int) $user->id === (int) $blockedId) {
            throw new HttpException(422, 'You cannot block yourself.');
        }

        User::findOrFail($blockedId);

        return BlockedUser::updateOrCreate(
            ['blocker_id' => $user->id, 'blocked_id' => $blockedId],
            ['reason' => $reason]
        );
    }

    public function unblock(User $user, int $blockedId): void
    {
        BlockedUser::where('blocker_id', $user->id)
            ->where('blocked_id', $blockedId)
            ->delete();
    }

    public function hasBlockBetween(int $firstUserId, int $secondUserId): bool
    {
        return BlockedUser::where(function ($q) use ($firstUserId, $secondUserId) {
            $q->where('blocker_id', $firstUserId)->where('blocked_id', $secondUserId);
        })->orWhere(function ($q) use ($firstUserId, $secondUserId) {
            $q->where('blocker_id', $secondUserId)->where('blocked_id', $firstUserId);
        })->exists();
    }

    public function blockedIdsFor(User $user): array
    {
        return BlockedUser::where('blocker_id', $user->id)
            ->pluck('blocked_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
}
