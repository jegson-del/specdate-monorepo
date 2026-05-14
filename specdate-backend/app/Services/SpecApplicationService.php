<?php

namespace App\Services;

use App\Models\Spec;
use App\Models\UserBalance;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SpecApplicationService
{
    public function __construct(
        private NotificationService $notificationService,
        private SpecParticipantService $participants,
    ) {
    }

    public function join($user, $id): array
    {
        $spec = Spec::with(['requirements', 'owner'])->findOrFail($id);

        if ($spec->expires_at && $spec->expires_at <= now()) {
            throw new HttpException(400, 'This spec has already started (applications closed).');
        }

        if ($spec->status !== 'OPEN') {
            throw new HttpException(400, 'This spec is not open for applications.');
        }

        if ((int) $spec->getAttribute('user_id') === (int) $user->getKey()) {
            throw new HttpException(400, 'You cannot join your own spec.');
        }

        if (!$user->profile_complete) {
            throw new HttpException(403, 'Your profile must be complete to join a spec.');
        }

        if ($spec->applications()->where('user_id', $user->id)->exists()) {
            throw new HttpException(400, 'You have already applied to this spec.');
        }

        $this->assertUserMeetsCompulsoryRequirements($user, $spec);

        $balance = DB::transaction(function () use ($spec, $user) {
            $existing = $spec->applications()->where('user_id', $user->id)->lockForUpdate()->first();
            if ($existing) {
                throw new HttpException(400, 'You have already applied to this spec.');
            }

            $spec->applications()->create([
                'user_id' => $user->id,
                'user_role' => 'participant',
                'status' => 'PENDING',
            ]);

            $this->notificationService->notify(
                $spec->owner,
                'join_request',
                [
                    'spec_id' => $spec->id,
                    'spec_title' => $spec->title,
                    'applicant_id' => $user->id,
                    'applicant_name' => $user->name ?? 'User',
                ],
                'New Join Request',
                "Someone wants to join '{$spec->title}'"
            );

            return UserBalance::where('user_id', $user->id)->first();
        });

        return [
            'balance' => ['credits' => $balance?->credits ?? 0],
        ];
    }

    public function approveApplication($user, $specId, $applicationId): void
    {
        $spec = $this->ownedSpec($user, $specId);
        $application = $this->applicationForSpec($spec, $applicationId);

        $wasAccepted = $application->status === 'ACCEPTED';
        $application->update(['status' => 'ACCEPTED']);

        if (!$wasAccepted && $application->user) {
            $this->notificationService->notify(
                $application->user,
                'application_accepted',
                [
                    'spec_id' => $spec->id,
                    'spec_title' => $spec->title,
                ],
                'Application accepted',
                "You have been accepted into '{$spec->title}'."
            );
        }

        $this->notifyOwnerWhenSpecIsFull($spec);
    }

    public function rejectApplication($user, $specId, $applicationId): void
    {
        $spec = $this->ownedSpec($user, $specId);
        $application = $this->applicationForSpec($spec, $applicationId);

        $application->update(['status' => 'REJECTED']);
    }

    public function eliminateApplication($user, $specId, $applicationId): array
    {
        $spec = $this->ownedSpec($user, $specId);
        $application = $this->applicationForSpec($spec, $applicationId);

        if ($application->user_role !== 'participant') {
            throw new HttpException(400, 'Only participants can be eliminated.');
        }

        if ($application->status === 'ELIMINATED') {
            throw new HttpException(400, 'Participant has already been eliminated.');
        }

        if ($application->status !== 'ACCEPTED') {
            throw new HttpException(400, 'Only accepted participants can be eliminated.');
        }

        DB::transaction(function () use ($spec, $application) {
            $application->update(['status' => 'ELIMINATED']);
            $this->participants->notifyEliminatedParticipant($application->user, $spec, null);
        });

        return $this->participants->lastManStandingPayload($spec) ?? ['message' => 'Participant eliminated.'];
    }

    private function ownedSpec($user, $specId): Spec
    {
        $spec = Spec::findOrFail($specId);

        if ($spec->user_id !== $user->id) {
            throw new HttpException(403, 'Unauthorized.');
        }

        return $spec;
    }

    private function applicationForSpec(Spec $spec, $applicationId)
    {
        $application = $spec->applications()->where('id', $applicationId)->first();
        if (!$application) {
            throw new HttpException(404, 'Application not found.');
        }

        return $application;
    }

    private function assertUserMeetsCompulsoryRequirements($user, Spec $spec): void
    {
        $profile = $user->profile;
        foreach ($spec->requirements as $req) {
            if (!$req->is_compulsory) {
                continue;
            }

            if ($req->field === 'age') {
                $userAge = $this->getAgeFromProfile($profile);
                if ($userAge === null) {
                    throw new HttpException(422, 'Requirement not met: age (date of birth required)');
                }
                $reqValue = $this->normalizeRequirementValue($req->value);
                if (!$this->checkAgeRequirement($userAge, $req->operator, $reqValue)) {
                    throw new HttpException(422, "Requirement not met: age (your age is {$userAge})");
                }
                continue;
            }

            if ($req->field === 'height') {
                $userHeight = $profile->height !== null && $profile->height !== '' ? (int) $profile->height : null;
                if ($userHeight === null) {
                    throw new HttpException(422, 'Requirement not met: height (height is required)');
                }
                $reqValue = $this->normalizeRequirementValue($req->value);
                if ($req->operator === '>=') {
                    if ($userHeight < $reqValue) {
                        throw new HttpException(422, "Requirement not met: height (min {$reqValue} cm, yours is {$userHeight} cm)");
                    }
                } elseif (!$this->checkNumericRequirement($userHeight, $req->operator ?? '=', $reqValue)) {
                    throw new HttpException(422, "Requirement not met: height (yours is {$userHeight} cm)");
                }
                continue;
            }

            if ($req->field === 'religion') {
                $reqVal = is_string($req->value) ? trim($req->value) : $req->value;
                if ($reqVal === '' || $reqVal === 'Any') {
                    continue;
                }
                $userReligion = $profile->religion ?? null;
                if ($userReligion === null || (string) $userReligion === '') {
                    throw new HttpException(422, 'Requirement not met: religion (add your religion in Profile)');
                }
                $reqValue = $this->decodedRequirementValue($req->value);
                if (is_array($reqValue)) {
                    if (!in_array((string) $userReligion, array_map('strval', $reqValue))) {
                        throw new HttpException(422, 'Requirement not met: religion (spec requires one of: ' . implode(', ', $reqValue) . ')');
                    }
                } elseif ((string) $userReligion !== (string) $reqValue) {
                    throw new HttpException(422, "Requirement not met: religion (spec requires: {$reqValue})");
                }
                continue;
            }

            $userValue = $profile->{$req->field} ?? null;
            $reqValue = $this->decodedRequirementValue($req->value);

            if (is_array($reqValue)) {
                if (!$userValue || !in_array((string) $userValue, array_map('strval', $reqValue))) {
                    throw new HttpException(422, "Requirement not met: {$req->field}");
                }
            } elseif ((string) $userValue !== (string) $reqValue) {
                throw new HttpException(422, "Requirement not met: {$req->field}");
            }
        }
    }

    private function notifyOwnerWhenSpecIsFull(Spec $spec): void
    {
        $spec->loadMissing('owner');
        if (!$spec->owner || $spec->status !== 'OPEN') {
            return;
        }

        $maxParticipants = (int) $spec->max_participants;
        if ($maxParticipants < 1 || $this->participants->activeParticipantCount($spec) < $maxParticipants) {
            return;
        }

        $type = 'spec_full';
        $reminderKey = 'spec_full_capacity';
        if (\App\Models\SpecNotificationLog::where('spec_id', $spec->id)
            ->where('user_id', $spec->owner->id)
            ->where('type', $type)
            ->where('reminder_key', $reminderKey)
            ->exists()) {
            return;
        }

        $this->notificationService->notify(
            $spec->owner,
            $type,
            [
                'spec_id' => $spec->id,
                'spec_title' => $spec->title,
                'accepted_count' => $maxParticipants,
            ],
            'Your spec is full',
            'Your spec is full. You can begin the quest before the spec start date.'
        );

        \App\Models\SpecNotificationLog::create([
            'spec_id' => $spec->id,
            'user_id' => $spec->owner->id,
            'type' => $type,
            'reminder_key' => $reminderKey,
            'channels' => ['database', 'push'],
            'sent_at' => now(),
        ]);
    }

    private function decodedRequirementValue($value)
    {
        if (is_string($value) && (str_starts_with(trim($value), '[') || str_starts_with(trim($value), '{'))) {
            return json_decode($value, true);
        }

        return $value;
    }

    private function getAgeFromProfile($profile): ?int
    {
        if (!$profile || !$profile->dob) {
            return null;
        }
        $dob = $profile->dob;
        $carbon = $dob instanceof \Carbon\Carbon ? $dob : \Carbon\Carbon::parse($dob);

        return (int) $carbon->diffInYears(now());
    }

    private function normalizeRequirementValue($value): int
    {
        return (int) $value;
    }

    private function checkAgeRequirement(int $userAge, string $operator, int $reqValue): bool
    {
        return match ($operator) {
            '>=' => $userAge >= $reqValue,
            '<=' => $userAge <= $reqValue,
            '=' => $userAge === $reqValue,
            '>' => $userAge > $reqValue,
            '<' => $userAge < $reqValue,
            default => $userAge === $reqValue,
        };
    }

    private function checkNumericRequirement(int $userValue, string $operator, int $reqValue): bool
    {
        return match ($operator) {
            '>=' => $userValue >= $reqValue,
            '<=' => $userValue <= $reqValue,
            '=' => $userValue === $reqValue,
            '>' => $userValue > $reqValue,
            '<' => $userValue < $reqValue,
            default => $userValue === $reqValue,
        };
    }
}
