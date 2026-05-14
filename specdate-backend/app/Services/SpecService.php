<?php

namespace App\Services;

use App\Models\SpecRound;
use App\Models\SpecRoundAnswer;
use App\Models\User;

class SpecService
{
    protected $specApplicationService;
    protected $specRoundService;
    protected $specDateService;
    protected $specMutationService;
    protected $specQueryService;
    protected $specInteractionService;

    public function __construct(
        SpecApplicationService $specApplicationService,
        SpecRoundService $specRoundService,
        SpecDateService $specDateService,
        SpecMutationService $specMutationService,
        SpecQueryService $specQueryService,
        SpecInteractionService $specInteractionService,
    )
    {
        $this->specApplicationService = $specApplicationService;
        $this->specRoundService = $specRoundService;
        $this->specDateService = $specDateService;
        $this->specMutationService = $specMutationService;
        $this->specQueryService = $specQueryService;
        $this->specInteractionService = $specInteractionService;
    }

    public function listForFeed($user, string $filter = 'LIVE', bool $excludeOwn = false)
    {
        return $this->specQueryService->listForFeed($user, $filter, $excludeOwn);
    }

    public function listMine($user, $type = 'all')
    {
        return $this->specQueryService->listMine($user, $type);
    }

    public function getOne($id, $user = null)
    {
        return $this->specQueryService->getOne($id, $user);
    }

    public function getOnePayload($id, $user = null): ?array
    {
        return $this->specQueryService->getOnePayload($id, $user);
    }



    public function join($user, $id): array
    {
        return $this->specApplicationService->join($user, $id);
    }

    public function approveApplication($user, $specId, $applicationId): void
    {
        $this->specApplicationService->approveApplication($user, $specId, $applicationId);
    }

    public function rejectApplication($user, $specId, $applicationId): void
    {
        $this->specApplicationService->rejectApplication($user, $specId, $applicationId);
    }

    public function eliminateApplication($user, $specId, $applicationId): array
    {
        return $this->specApplicationService->eliminateApplication($user, $specId, $applicationId);
    }

    public function toggleLike($user, $specId): array
    {
        return $this->specInteractionService->toggleLike($user, $specId);
    }

    /**
     * Start a new elimination round.
     */
    public function startRound($user, $specId, string $question = '', $mediaId = null): SpecRound
    {
        return $this->specRoundService->startRound($user, $specId, $question, $mediaId);
    }

    /**
     * Update an active round question.
     */
    public function updateRound($user, $roundId, $question)
    {
        return $this->specRoundService->updateRound($user, $roundId, $question);
    }

    /**
     * Submit answer for a round.
     */
    public function submitAnswer($user, $roundId, string $answer = '', $mediaId = null): SpecRoundAnswer
    {
        return $this->specRoundService->submitAnswer($user, $roundId, $answer, $mediaId);
    }

    /**
     * Close the current round and move to REVIEWING status.
     */
    public function closeRound($user, $roundId)
    {
        return $this->specRoundService->closeRound($user, $roundId);
    }

    /**
     * Eliminate a single user (Owner only).
     */
    public function eliminateUser($user, $roundId, $userIdToEliminate)
    {
        return $this->specRoundService->eliminateUser($user, $roundId, $userIdToEliminate);
    }

    /**
     * Eliminate users in a round (Bulk - Legacy/Fallback).
     */
    public function eliminateUsers($user, $roundId, array $userIdsToEliminate)
    {
        return $this->specRoundService->eliminateUsers($user, $roundId, $userIdsToEliminate);
    }

    /**
     * Create a date (match) when there is exactly one active participant (last man standing).
     * Stores winner_user_id, owner_id, spec_id, and generates a 6-char alphanumeric date_code.
     */
    public function createDate($user, $specId)
    {
        return $this->specDateService->createDate($user, $specId);
    }

    public function scheduleFollowUpDate(User $user, int $dateId): array
    {
        return $this->specDateService->scheduleFollowUpDate($user, $dateId);
    }

    public function listDatesForUser($user, int $perPage = 20)
    {
        return $this->specDateService->listDatesForUser($user, $perPage);
    }

    /**
     * Extend search: charge the owner one credit, eliminate the last remaining
     * participant, and set spec status to OPEN so the owner can recruit again.
     * $comment is sent to the eliminated user in the notification.
     */
    public function extendSearch($user, $specId, ?string $comment = null)
    {
        return $this->specInteractionService->extendSearch($user, $specId, $comment);
    }

    /**
     * Nudge users who haven't answered.
     */
    public function nudgeUsers($user, $roundId, array $userIdsToNudge)
    {
        return $this->specRoundService->nudgeUsers($user, $roundId, $userIdsToNudge);
    }

    /**
     * Create a new spec with requirements.
     *
     * @param array $data
     * @param \App\Models\User $user
     * @return \App\Models\Spec
     * @throws \Exception
     */
    public function createSpec(array $data, $user)
    {
        return $this->specMutationService->createSpec($data, $user);
    }

    /**
     * Update an existing spec.
     *
     * @param \App\Models\User $user
     * @param int $id
     * @param array $data
     * @return \App\Models\Spec
     * @throws HttpException
     */
    public function updateSpec($user, $id, array $data)
    {
        return $this->specMutationService->updateSpec($user, $id, $data);
    }

    /**
     * Get pending join requests for all specs owned by the user.
     */
    public function getPendingRequests($user)
    {
        return $this->specQueryService->getPendingRequests($user);
    }
}
