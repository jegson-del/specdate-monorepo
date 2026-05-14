<?php

namespace App\Services;

use App\Models\Spec;
use App\Models\SpecRound;
use App\Models\User;

class SpecParticipantService
{
    public function __construct(private NotificationService $notificationService)
    {
    }

    public function activeParticipantApplications(Spec $spec)
    {
        return $spec->applications()
            ->where('user_role', 'participant')
            ->where('status', 'ACCEPTED');
    }

    public function activeParticipantCount(Spec $spec): int
    {
        return $this->activeParticipantApplications($spec)->count();
    }

    public function lastManStandingPayload(Spec $spec): ?array
    {
        if ($this->activeParticipantCount($spec) !== 1) {
            return null;
        }

        $winnerApp = $this->activeParticipantApplications($spec)->with('user.profile')->first();
        $winner = $winnerApp ? $winnerApp->user : null;
        if (!$winner) {
            return null;
        }

        $winnerName = $winner->profile
            ? ($winner->profile->full_name ?? $winner->name ?? 'Winner')
            : ($winner->name ?? 'Winner');

        return [
            'message' => 'Participant eliminated.',
            'last_man_standing' => true,
            'spec_id' => $spec->id,
            'winner' => [
                'user_id' => $winner->id,
                'name' => $winnerName,
            ],
        ];
    }

    public function notifyEliminatedParticipant(?User $victim, Spec $spec, ?SpecRound $round): void
    {
        if (!$victim) {
            return;
        }

        $payload = ['spec_id' => $spec->id];
        if ($round) {
            $payload['round_id'] = $round->id;
        }

        $this->notificationService->notify(
            $victim,
            'eliminated',
            $payload,
            'You were eliminated',
            "You have been eliminated from '{$spec->title}'."
        );
    }
}
