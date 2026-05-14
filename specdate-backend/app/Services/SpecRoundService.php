<?php

namespace App\Services;

use App\Models\Spec;
use App\Models\SpecRound;
use App\Models\SpecRoundAnswer;
use App\Models\User;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SpecRoundService
{
    public function __construct(
        private NotificationService $notificationService,
        private MediaAttachmentPolicyService $mediaAttachmentPolicy,
        private SpecParticipantService $participants,
    ) {
    }

    public function startRound($user, $specId, string $question = '', $mediaId = null): SpecRound
    {
        $spec = Spec::findOrFail($specId);

        if ($spec->user_id !== $user->id) {
            throw new HttpException(403, 'Unauthorized.');
        }

        if (in_array($spec->status, ['COMPLETED', 'EXPIRED'], true)) {
            throw new HttpException(400, 'Cannot start a round on a closed or expired spec.');
        }

        if ($mediaId) {
            $this->assertAttachableMedia($user, $mediaId, ['round_question_image', 'round_question_video', 'round_question_audio']);
        }

        $activeCount = $this->participants->activeParticipantCount($spec);
        if ($activeCount < 1) {
            throw new HttpException(400, 'Not enough participants to start a round.');
        }

        $eliminationCount = max(1, (int) ceil($activeCount * 0.1));

        $latestRound = $spec->rounds()->latest('id')->first();
        if ($latestRound && ($latestRound->status === 'ACTIVE' || $latestRound->status === 'REVIEWING')) {
            $latestRound->update(['status' => 'COMPLETED']);
        }

        if ($spec->status === 'OPEN') {
            $spec->status = 'ACTIVE';
            if ($activeCount < (int) $spec->max_participants) {
                $spec->max_participants = $activeCount;
            }
            $spec->save();
        }

        $nextRoundNumber = $spec->rounds()->max('round_number') + 1;

        $round = $spec->rounds()->create([
            'round_number' => $nextRoundNumber,
            'question_text' => $question,
            'media_id' => $mediaId,
            'status' => 'ACTIVE',
            'elimination_count' => $eliminationCount,
        ]);

        \App\Events\RoundStarted::dispatch($round);

        $acceptedParticipants = $this->participants->activeParticipantApplications($spec)->with('user')->get();
        foreach ($acceptedParticipants as $app) {
            $this->notificationService->notify(
                $app->user,
                'round_started',
                [
                    'spec_id' => $spec->id,
                    'round_id' => $round->id,
                    'question' => $question,
                ],
                'New Question Asked',
                "{$user->username} asked a question"
            );
        }

        return $round->load('media');
    }

    public function updateRound($user, $roundId, $question)
    {
        $round = SpecRound::with('spec')->findOrFail($roundId);

        if ($round->spec->user_id !== $user->id) {
            throw new HttpException(403, 'Unauthorized.');
        }

        if ($round->status !== 'ACTIVE') {
            throw new HttpException(400, 'Can only edit active rounds.');
        }

        $round->update(['question_text' => $question]);

        \App\Events\RoundStarted::dispatch($round);

        return $round;
    }

    public function submitAnswer($user, $roundId, string $answer = '', $mediaId = null): SpecRoundAnswer
    {
        $round = SpecRound::findOrFail($roundId);
        $answer = trim($answer);

        if ($answer === '' && !$mediaId) {
            throw new HttpException(400, 'Please add an answer or attach a file.');
        }

        if ($mediaId) {
            $this->assertAttachableMedia($user, $mediaId, ['round_answer_image', 'round_answer_video', 'round_answer_audio']);
        }

        if ($round->status !== 'ACTIVE') {
            throw new HttpException(400, 'Round is not active.');
        }

        $application = $round->spec->applications()
            ->where('user_id', $user->id)
            ->where('user_role', 'participant')
            ->where('status', 'ACCEPTED')
            ->first();

        if (!$application) {
            throw new HttpException(403, 'You are not an active participant in this spec.');
        }

        $existing = $round->answers()->where('user_id', $user->id)->first();
        if ($existing) {
            throw new HttpException(400, 'You have already answered this question.');
        }

        $answerModel = $round->answers()->create([
            'user_id' => $user->id,
            'answer_text' => $answer,
            'media_id' => $mediaId,
        ]);

        if ($round->spec->user_id !== $user->id) {
            $this->notificationService->notify(
                $round->spec->owner,
                'round_answer',
                [
                    'spec_id' => $round->spec->id,
                    'round_id' => $round->id,
                    'answer_id' => $answerModel->id,
                    'title' => 'New Answer Submitted',
                    'message' => "{$user->username} has answered your question.",
                ],
                'New Answer Submitted',
                "{$user->username} has answered your question."
            );
        }

        \App\Events\RoundAnswered::dispatch($answerModel);

        $participantCount = $this->participants->activeParticipantCount($round->spec);
        $answerCount = $round->answers()->count();

        if ($answerCount >= $participantCount) {
            $this->closeRound($round->spec->owner, $roundId);
        }

        return $answerModel;
    }

    public function closeRound($user, $roundId)
    {
        $round = SpecRound::with('spec')->findOrFail($roundId);

        if ($round->spec->user_id !== $user->id) {
            throw new HttpException(403, 'Unauthorized.');
        }

        if ($round->status !== 'ACTIVE') {
            throw new HttpException(400, 'Round is not active.');
        }

        $round->update(['status' => 'REVIEWING']);

        return $round;
    }

    public function eliminateUser($user, $roundId, $userIdToEliminate)
    {
        $round = SpecRound::with('spec')->findOrFail($roundId);

        if ($round->spec->user_id !== $user->id) {
            throw new HttpException(403, 'Unauthorized.');
        }

        if ($round->status !== 'REVIEWING' && $round->status !== 'ACTIVE') {
            throw new HttpException(400, 'Round must be Active or In Review to eliminate participants.');
        }

        $application = $round->spec->applications()
            ->where('user_id', $userIdToEliminate)
            ->where('user_role', 'participant')
            ->where('status', 'ACCEPTED')
            ->first();

        if (!$application) {
            throw new HttpException(404, 'Active participant not found.');
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($round, $userIdToEliminate, $application) {
            $round->answers()->where('user_id', $userIdToEliminate)->update(['is_eliminated' => true]);
            $application->update(['status' => 'ELIMINATED']);
            $this->participants->notifyEliminatedParticipant($application->user, $round->spec, $round);
        });

        $lastManStanding = $this->participants->lastManStandingPayload($round->spec);
        if ($lastManStanding) {
            return $lastManStanding;
        }

        return ['message' => 'User eliminated.'];
    }

    public function eliminateUsers($user, $roundId, array $userIdsToEliminate)
    {
        $lastResult = null;
        foreach ($userIdsToEliminate as $uid) {
            $lastResult = $this->eliminateUser($user, $roundId, $uid);
        }

        return ($lastResult && !empty($lastResult['last_man_standing']))
            ? $lastResult
            : ['message' => 'Users eliminated.'];
    }

    public function nudgeUsers($user, $roundId, array $userIdsToNudge)
    {
        $round = SpecRound::with('spec')->findOrFail($roundId);

        if ($round->spec->user_id !== $user->id) {
            throw new HttpException(403, 'Unauthorized.');
        }

        if ($round->status !== 'ACTIVE') {
            throw new HttpException(400, 'Can only nudge in active rounds.');
        }

        $count = 0;
        foreach ($userIdsToNudge as $userId) {
            $targetUser = User::find($userId);
            if ($targetUser) {
                $application = $round->spec->applications()
                    ->where('user_id', $userId)
                    ->where('user_role', 'participant')
                    ->where('status', 'ACCEPTED')
                    ->first();
                $hasAnswered = $round->answers()->where('user_id', $userId)->exists();

                if ($application && !$hasAnswered) {
                    $this->notificationService->notify(
                        $targetUser,
                        'round_nudge',
                        [
                            'spec_id' => $round->spec->id,
                            'round_id' => $round->id,
                            'title' => 'Action Required',
                            'message' => "You have not answered the question for '{$round->spec->title}' yet. Please submit your answer soon!",
                        ],
                        'Action Required',
                        "You have not answered the question for '{$round->spec->title}' yet. Please submit your answer soon!"
                    );
                    $count++;
                }
            }
        }

        return ['message' => "Nudged {$count} participants."];
    }

    private function assertAttachableMedia(User $user, int|string $mediaId, array $types): void
    {
        $media = \App\Models\Media::query()
            ->where('id', $mediaId)
            ->where('user_id', $user->id)
            ->whereIn('type', $types)
            ->whereNull('hidden_at')
            ->first();

        if (!$media) {
            throw new HttpException(422, 'Media not found.');
        }

        if (!$this->mediaAttachmentPolicy->canAttach($media)) {
            throw new HttpException(422, $this->mediaAttachmentPolicy->blockedMessage());
        }
    }
}
