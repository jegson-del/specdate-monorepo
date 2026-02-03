<?php

namespace App\Services;

use App\Models\Spec;
use App\Models\SpecRound;
use App\Models\SpecRoundAnswer;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SpecService
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    public function listForFeed($user, string $filter = 'LIVE', bool $excludeOwn = false)
    {
        $query = Spec::query()
            ->with(['owner.profile', 'owner.media', 'requirements'])
            ->withCount(['applications', 'likes'])
            ->where('status', 'OPEN')
            ->where('expires_at', '>', now())
            ->whereHas('owner', fn ($q) => $q->where('is_paused', false));

        if ($excludeOwn) {
            $query->where('user_id', '!=', $user->id);
        }

        // NOTE: In early MVP data sets, these can overlap; the goal is different "feels":
        // - LIVE: newly created
        // - ONGOING: ending soon
        // - POPULAR: most applications
        // - HOTTEST: recent + popular
        switch ($filter) {
            case 'POPULAR':
                $query->orderByDesc('applications_count');
                break;
            case 'HOTTEST':
                $query->where('created_at', '>=', now()->subDays(3))
                    ->orderByDesc('applications_count');
                break;
            case 'ONGOING':
                $query->where('expires_at', '<=', now()->addDays(2))
                    ->orderBy('expires_at', 'asc');
                break;
            case 'LIVE':
            default:
                // All active specs (default)
                $query->latest();
                break;
        }

        $specs = $query->paginate(10);

        // Append tag to each item for frontend mapping
        $specs->getCollection()->transform(function ($spec) use ($filter) {
            $spec->tag = $filter;
            return $spec;
        });

        return $specs;
    }

    public function listMine($user, $type = 'all')
    {
        $query = Spec::query()
            ->with(['requirements', 'owner.profile', 'owner.media'])
            ->withCount('applications');

        if ($type === 'owned') {
            $query->where('user_id', $user->id);
        } elseif ($type === 'joined') {
            $query->whereHas('applications', function ($a) use ($user) {
                $a->where('user_id', $user->id);
            })->where('user_id', '!=', $user->id); // Ensure not picking own specs if joined logic is loose (though app prevents joining own)
        } else {
             // 'all'
             $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereHas('applications', function ($a) use ($user) {
                        $a->where('user_id', $user->id);
                    });
            });
        }

        $specs = $query->latest()->paginate(20);

        // Inject owner avatar URL
        $specs->getCollection()->transform(function ($spec) {
            if ($spec->owner) {
                // If owner is loaded, get avatar from media
                $avatarMedia = $spec->owner->media->where('type', 'avatar')->sortByDesc('id')->first();
                $url = $avatarMedia ? $avatarMedia->url : null;
                
                if (!$spec->owner->profile) {
                    $spec->owner->profile = (object) []; // Dummy if missing
                }
                $spec->owner->profile->avatar = $url;
            }
            return $spec;
        });

        return $specs;
    }

    public function getOne($id, $user = null)
    {
        $query = Spec::with(['owner.profile', 'owner.media', 'requirements'])
            ->withCount(['applications', 'likes'])
            ->with(['applications' => function($q) {
                // Return all applications so we can see statuses; load user profile + media for avatar from media table
                $q->with('user.profile', 'user.media');
            }])
            ->with(['rounds' => function($q) {
                $q->where('status', 'ACTIVE');
            }]);

        if ($user) {
            $query->withExists(['likes as is_liked' => function ($q) use ($user) {
                $q->where('user_id', $user->id);
            }]);
            
             // Include answers for the active round
            $query->with(['rounds.answers' => function($q) use ($user) {
                // If checking for "is owner", we need to know the spec's owner ID.
                // But here we are building the query for the SPEC.
                // We can't easily access the spec instance inside this closure before fetching.
                // OPTION: Fetch spec first, then load? Or use conditional loading in Controller?
                // OR: Spec::with ...
                // Let's modify this to LOAD all answers, and we might filter in frontend?
                // NO, privacy. 
                // Better approach: In Controller/Service after fetching, if user==owner, load all answers.
                // But here we attempt to do it in one query.
                // Let's remove this specific constraint here and handle it better in getOne logic below.
            }]);
        }

        $spec = $query->find($id);

        if ($spec && $user) {
             // Privacy Logic for Answers:
             // If User is Owner -> See ALL answers
             // If User is Participant -> See ONLY OWN answer
             
             // We already applied a constraint above? No, I'm rewriting it.
             // Let's do:
             if ($spec->user_id === $user->id) {
                 // Owner: Load all answers for active rounds
                 $spec->load(['rounds.answers.user.profile', 'rounds.answers.user.media']); // Load user profile for display
             } else {
                 // Participant: Load only their answer
                 $spec->load(['rounds.answers' => function($q) use ($user) {
                     $q->where('user_id', $user->id);
                 }]);
             }
        }

        return $spec;
    }



    public function join($user, $id): void
    {
        $spec = Spec::with('requirements')->findOrFail($id);

        // Compare as integers so string/int from DB or auth never causes a false positive
        $ownerId = (int) $spec->getAttribute('user_id');
        $currentUserId = (int) $user->getKey();
        if ($ownerId === $currentUserId) {
            throw new HttpException(400, 'You cannot join your own spec.');
        }

        if (!$user->profile_complete) {
            throw new HttpException(403, 'Your profile must be complete to join a spec.');
        }

        $existing = $spec->applications()->where('user_id', $user->id)->first();
        if ($existing) {
            throw new HttpException(400, 'You have already applied to this spec.');
        }

        // Check Sparks
        $balance = $user->balance;
        if (!$balance || $balance->blue_sparks < 1) {
            throw new HttpException(403, 'Insufficient Blue Sparks. Please purchase more.', null, ['code' => 'INSUFFICIENT_FUNDS']);
        }

        // Check Requirements (with age derived from dob)
        $profile = $user->profile;
        foreach ($spec->requirements as $req) {
            if (!$req->is_compulsory) continue;

            // Age: profile has dob, not age — compute age from dob for requirement check
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

            // Height: min height is ">= value" (cm). User must be at or above required height.
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
                } else {
                    if (!$this->checkNumericRequirement($userHeight, $req->operator ?? '=', $reqValue)) {
                        throw new HttpException(422, "Requirement not met: height (yours is {$userHeight} cm)");
                    }
                }
                continue;
            }

            $userValue = $profile->{$req->field} ?? null;
            $reqValue = $req->value;
            // Value may be JSON string in DB (e.g. from json_encode)
            if (is_string($reqValue) && (str_starts_with(trim($reqValue), '[') || str_starts_with(trim($reqValue), '{'))) {
                $reqValue = json_decode($reqValue, true);
            }

            if (is_array($reqValue)) {
                if (!$userValue || !in_array((string) $userValue, array_map('strval', $reqValue))) {
                    throw new HttpException(422, "Requirement not met: {$req->field}");
                }
            } else {
                if ((string) $userValue !== (string) $reqValue) {
                    throw new HttpException(422, "Requirement not met: {$req->field}");
                }
            }
        }

        DB::transaction(function () use ($spec, $user, $balance) {
            // Debit Spark
            $balance->decrement('blue_sparks');

            // Log Transaction
            $user->transactions()->create([
                'type' => 'DEBIT',
                'item_type' => 'blue_spark',
                'quantity' => 1,
                'amount' => 0, // No money spent now, just using inventory
                'currency' => 'GBP',
                'purpose' => "Joined Spec: {$spec->title}",
                'metadata' => ['spec_id' => $spec->id],
            ]);

            // Create Application
            $spec->applications()->create([
                'user_id' => $user->id,
                'user_role' => 'participant',
                'status' => 'PENDING',
            ]);

            // Notify Owner
            $this->notificationService->notify(
                $spec->owner, 
                'join_request',
                [
                    'spec_id' => $spec->id, 
                    'spec_title' => $spec->title,
                    'applicant_id' => $user->id,
                    'applicant_name' => $user->name ?? 'User'
                ],
                'New Join Request',
                "Someone wants to join '{$spec->title}'"
            );
        });
    }

    public function approveApplication($user, $specId, $applicationId): void
    {
        $spec = Spec::findOrFail($specId);

        if ($spec->user_id !== $user->id) {
            throw new HttpException(403, 'Unauthorized.');
        }

        $application = $spec->applications()->where('id', $applicationId)->first();
        if (!$application) {
            throw new HttpException(404, 'Application not found.');
        }

        $application->update(['status' => 'ACCEPTED']);
    }

    public function rejectApplication($user, $specId, $applicationId): void
    {
        $spec = Spec::findOrFail($specId);

        if ($spec->user_id !== $user->id) {
            throw new HttpException(403, 'Unauthorized.');
        }

        $application = $spec->applications()->where('id', $applicationId)->first();
        if (!$application) {
            throw new HttpException(404, 'Application not found.');
        }

        $application->update(['status' => 'REJECTED']);
    }

    public function eliminateApplication($user, $specId, $applicationId): void
    {
        $spec = Spec::findOrFail($specId);

        if ($spec->user_id !== $user->id) {
            throw new HttpException(403, 'Unauthorized.');
        }

        $application = $spec->applications()->where('id', $applicationId)->first();
        if (!$application) {
            throw new HttpException(404, 'Application not found.');
        }

        $application->update(['status' => 'ELIMINATED']);
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
            'count' => $spec->likes()->count()
        ];
    }

    /**
     * Start a new elimination round.
     */
    public function startRound($user, $specId, string $question): SpecRound
    {
        $spec = Spec::findOrFail($specId);

        if ($spec->user_id !== $user->id) {
            throw new HttpException(403, 'Unauthorized.');
        }

        // Count active participants (ACCEPTED status)
        $activeCount = $spec->applications()->where('status', 'ACCEPTED')->count();
        if ($activeCount < 1) {
             throw new HttpException(400, 'Not enough participants to start a round.');
        }

        // Calculate 10% elimination (minimum 1 if there are participants)
        $eliminationCount = max(1, (int) ceil($activeCount * 0.1));

        // Check for any existing active/reviewing round and close/complete it
        $latestRound = $spec->rounds()->latest('id')->first();
        if ($latestRound && ($latestRound->status === 'ACTIVE' || $latestRound->status === 'REVIEWING')) {
            $latestRound->update(['status' => 'COMPLETED']);
        }
        
        // Find next round number
        $nextRoundNumber = $spec->rounds()->max('round_number') + 1;

        $round = $spec->rounds()->create([
            'round_number' => $nextRoundNumber,
            'question_text' => $question,
            'status' => 'ACTIVE',
            'elimination_count' => $eliminationCount,
        ]);

        // Broadcast Real-time Event
        \App\Events\RoundStarted::dispatch($round);

        // Notify all ACCEPTED participants
        $participants = $spec->applications()->where('status', 'ACCEPTED')->with('user')->get();
        foreach ($participants as $app) {
            $this->notificationService->notify(
                $app->user,
                'round_started',
                [
                    'spec_id' => $spec->id,
                    'round_id' => $round->id,
                    'question' => $question
                ],
                'New Round Started!',
                "Round {$nextRoundNumber}: {$question}"
            );
        }

        return $round;
    }

    /**
     * Submit answer for a round.
     */
    public function submitAnswer($user, $roundId, string $answer): SpecRoundAnswer
    {
        $round = SpecRound::findOrFail($roundId);
        
        if ($round->status !== 'ACTIVE') {
            throw new HttpException(400, 'Round is not active.');
        }

        // Verify user is a participant
        $application = $round->spec->applications()
            ->where('user_id', $user->id)
            ->where('status', 'ACCEPTED')
            ->first();

        if (!$application) {
            throw new HttpException(403, 'You are not an active participant in this spec.');
        }

        // Check if already answered
        $existing = $round->answers()->where('user_id', $user->id)->first();
        if ($existing) {
             throw new HttpException(400, 'You have already answered this question.');
        }

        $answerModel = $round->answers()->create([
            'user_id' => $user->id,
            'answer_text' => $answer,
        ]);

        // Notify Spec Owner (if not the answerer, which should be guaranteed by role checks but safe to check)
        if ($round->spec->user_id !== $user->id) {
            $this->notificationService->notify(
                $round->spec->owner,
                'round_answer',
                [
                    'spec_id' => $round->spec->id, 
                    'round_id' => $round->id, 
                    'answer_id' => $answerModel->id,
                    'title' => 'New Answer Submitted',
                    'message' => "{$user->username} has answered your question."
                ],
                'New Answer Submitted',
                "{$user->username} has answered your question."
            );
        }

        // Broadcast event
        \App\Events\RoundAnswered::dispatch($answerModel);

        // Check for Auto-Close Trigger (All participants have answered)
        $participantCount = $round->spec->applications()->where('status', 'ACCEPTED')->count();
        $answerCount = $round->answers()->count();

        if ($answerCount >= $participantCount) {
             $this->closeRound($round->spec->user, $roundId); // Simulate owner closing it
        }

        return $answerModel;
    }

    /**
     * Close the current round and move to REVIEWING status.
     */
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
        
        // Broadcast Event
        // \App\Events\RoundStatusUpdated::dispatch($round);

        return $round;
    }

    /**
     * Eliminate a single user (Owner only).
     */
    public function eliminateUser($user, $roundId, $userIdToEliminate)
    {
        $round = SpecRound::with('spec')->findOrFail($roundId);

        if ($round->spec->user_id !== $user->id) {
            throw new HttpException(403, 'Unauthorized.');
        }

        // Allow elimination in REVIEWING state (and technically ACTIVE too if desired)
        if ($round->status !== 'REVIEWING' && $round->status !== 'ACTIVE') {
             throw new HttpException(400, 'Round must be Active or In Review to eliminate participants.');
        }

        DB::transaction(function () use ($round, $userIdToEliminate) {
            // 1. Mark answer as eliminated (if exists)
            $round->answers()->where('user_id', $userIdToEliminate)->update(['is_eliminated' => true]);

            // 2. Update Application Status to ELIMINATED
            $round->spec->applications()
                ->where('user_id', $userIdToEliminate)
                ->update(['status' => 'ELIMINATED']);
            
            // 3. Log Spark Loss (Red Spark) - "Spark Extinguished"
            $victim = User::find($userIdToEliminate);
            if ($victim) {
                 $victim->balance()->decrement('red_sparks'); // Lose a life
                 
                 // Log Transaction
                 $victim->transactions()->create([
                    'type' => 'DEBIT',
                    'item_type' => 'red_spark',
                    'quantity' => 1,
                    'amount' => 0,
                    'currency' => 'GBP',
                    'purpose' => "Eliminated from Spec: {$round->spec->title}",
                    'metadata' => ['spec_id' => $round->spec->id, 'round_id' => $round->id],
                ]);

                // Notify
                $this->notificationService->notify(
                    $victim,
                    'eliminated',
                    ['spec_id' => $round->spec->id],
                    'Spark Extinguished',
                     "You have been eliminated from '{$round->spec->title}'."
                );
            }
        });

        return ['message' => 'User eliminated.'];
    }

    /**
     * Eliminate users in a round (Bulk - Legacy/Fallback).
     */
    public function eliminateUsers($user, $roundId, array $userIdsToEliminate)
    {
        // ... Reusing logic or deprecating. For now, let's keep it but wrap the new single logic?
        // Or just keep as is for backward compat if needed.
        // But for "Modern Flow", we use eliminateUser singular.
        
        // Let's repurpose this to Loop eliminateUser for simplicity if bulk is ever needed again
        foreach($userIdsToEliminate as $uid) {
            $this->eliminateUser($user, $roundId, $uid);
        }
        
        // And then close? Modern flow says explicit close. 
        // If this old endpoint is called, it implied closing.
        $round = SpecRound::findOrFail($roundId);
        $round->update(['status' => 'COMPLETED']);

        return ['message' => 'Round completed and users eliminated.'];
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
        if ($user->is_paused) {
            throw new HttpException(403, 'You cannot create a spec while your account is paused. Unpause your account in Profile settings.');
        }

        try {
            DB::beginTransaction();

            $spec = Spec::create([
                'user_id' => $user->id,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'location_city' => $data['location_city'] ?? null,
                'location_lat' => $data['location_lat'] ?? null,
                'location_lng' => $data['location_lng'] ?? null,
                'expires_at' => now()->addDays($data['duration']),
                'max_participants' => $data['max_participants'],
                'status' => 'OPEN',
            ]);

            // Auto-create application for owner
            $spec->applications()->create([
                'user_id' => $user->id,
                'user_role' => 'owner',
                'status' => 'ACCEPTED', // Owner is always accepted
            ]);

            if (!empty($data['requirements'])) {
                foreach ($data['requirements'] as $req) {
                    $spec->requirements()->create([
                        'field' => $req['field'],
                        'operator' => $req['operator'],
                        'value' => is_array($req['value']) ? json_encode($req['value']) : $req['value'],
                        'is_compulsory' => $req['is_compulsory'] ?? false,
                    ]);
                }
            }

            DB::commit();

            return $spec->load('requirements');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Spec creation failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get user's current age in years from profile dob (null if no dob).
     * Uses Carbon: age = years from dob to today (same as frontend calculation).
     */
    protected function getAgeFromProfile($profile): ?int
    {
        if (!$profile || !$profile->dob) {
            return null;
        }
        $dob = $profile->dob;
        $carbon = $dob instanceof \Carbon\Carbon ? $dob : \Carbon\Carbon::parse($dob);
        return (int) $carbon->diffInYears(now());
    }

    /**
     * Normalize requirement value from DB (may be string "35" or int 35).
     */
    protected function normalizeRequirementValue($value): int
    {
        if (is_numeric($value)) {
            return (int) $value;
        }
        return (int) $value;
    }

    /**
     * Check age against a single requirement (e.g. >= 35 or <= 50).
     */
    protected function checkAgeRequirement(int $userAge, string $operator, int $reqValue): bool
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

    /**
     * Check a numeric value (e.g. height in cm) against operator (>=, <=, =, etc.).
     */
    protected function checkNumericRequirement(int $userValue, string $operator, int $reqValue): bool
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

    /**
     * Get pending join requests for all specs owned by the user.
     */
    public function getPendingRequests($user)
    {
        $applications = \App\Models\SpecApplication::query()
            ->whereHas('spec', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->where('status', 'PENDING')
            ->with(['spec:id,title,user_id', 'user.profile', 'user.media']) // Load applicant profile and spec info
            ->latest()
            ->get();

        // Inject avatar URL into each application's user profile
        return $applications->map(function ($app) {
            if ($app->user) {
                $avatarMedia = $app->user->media->where('type', 'avatar')->sortByDesc('id')->first();
                if ($app->user->profile) {
                    $app->user->profile->avatar = $avatarMedia ? $avatarMedia->url : null;
                } else {
                     // Create a dummy profile object if missing so frontend doesn't crash
                     $app->user->profile = (object) ['avatar' => $avatarMedia ? $avatarMedia->url : null, 'full_name' => $app->user->name, 'age' => null];
                }
            }
            return $app;
        });
    }
}
