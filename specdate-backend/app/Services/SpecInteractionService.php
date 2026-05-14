<?php

namespace App\Services;

use App\Models\Spec;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SpecInteractionService
{
    public function __construct(
        private NotificationService $notificationService,
        private SpecParticipantService $participants,
        private UserCreditService $credits,
    ) {
    }

    public function toggleLike($user, $specId): array
    {
        $spec = Spec::findOrFail($specId);

        $existing = $spec->likes()->where('user_id', $user->id)->first();

        if ($existing) {
            $existing->delete();
            $liked = false;
        } else {
            $spec->likes()->create(['user_id' => $user->id]);
            $liked = true;
        }

        return [
            'liked' => $liked,
            'count' => $spec->likes()->count(),
        ];
    }

    public function extendSearch($user, $specId, ?string $comment = null): array
    {
        $spec = Spec::with('rounds')->findOrFail($specId);
        if ($spec->user_id !== $user->id) {
            throw new HttpException(403, 'You are not the owner of this spec.');
        }

        $winnerApp = $this->participants->activeParticipantApplications($spec)->with('user')->first();
        if (!$winnerApp || $this->participants->activeParticipantCount($spec) !== 1) {
            throw new HttpException(400, 'There must be exactly one active participant to extend search.');
        }

        $round = $spec->rounds()->orderByDesc('round_number')->first();
        if (!$round) {
            throw new HttpException(400, 'No round found; cannot eliminate.');
        }

        $body = "The owner of '{$spec->title}' has extended their search. You have been removed from this quest.";
        if ($comment !== null && trim($comment) !== '') {
            $body .= "\n\nMessage from the owner: " . trim($comment);
        }

        $balance = DB::transaction(function () use ($user, $spec, $winnerApp, $round, $body) {
            $balance = $this->credits->debitCredit(
                $user,
                "Extended Spec: {$spec->title}",
                ['spec_id' => $spec->id, 'action' => 'extend_search']
            );

            $round->answers()->where('user_id', $winnerApp->user_id)->update(['is_eliminated' => true]);
            $winnerApp->update(['status' => 'ELIMINATED']);
            $spec->update(['status' => 'OPEN']);

            $victim = $winnerApp->user;
            if ($victim) {
                $this->notificationService->notify(
                    $victim,
                    'eliminated',
                    ['spec_id' => $spec->id, 'round_id' => $round->id],
                    'Search extended',
                    $body
                );
            }

            return $balance;
        });

        return [
            'message' => 'Search extended. Edit your spec and keep it open to get more applicants.',
            'balance' => ['credits' => $balance->credits],
        ];
    }
}
