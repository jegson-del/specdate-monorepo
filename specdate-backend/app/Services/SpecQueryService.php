<?php

namespace App\Services;

use App\Models\Spec;
use App\Models\SpecApplication;
use App\Models\SpecRoundAnswer;

class SpecQueryService
{
    public function listForFeed($user, string $filter = 'LIVE', bool $excludeOwn = false)
    {
        $query = Spec::query()
            ->with(['owner.profile', 'owner.media', 'requirements'])
            ->withCount(['applications', 'likes'])
            ->whereHas('owner', fn ($q) => $q->where('is_paused', false));

        if ($excludeOwn) {
            $query->where('user_id', '!=', $user->id);
        }

        switch ($filter) {
            case 'POPULAR':
                $query->where('status', 'OPEN')
                    ->where('expires_at', '>', now())
                    ->orderByDesc('applications_count');
                break;
            case 'HOTTEST':
                $query->where('status', 'OPEN')
                    ->where('expires_at', '>', now())
                    ->where('created_at', '>=', now()->subDays(3))
                    ->orderByDesc('applications_count');
                break;
            case 'ONGOING':
                $query->where('status', 'ACTIVE')
                    ->orderBy('expires_at', 'asc');
                break;
            case 'LIVE':
            default:
                $query->where('status', 'OPEN')
                    ->where('expires_at', '>', now())
                    ->latest();
                break;
        }

        $specs = $query->paginate(10);

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
            })->where('user_id', '!=', $user->id);
        } else {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereHas('applications', function ($a) use ($user) {
                        $a->where('user_id', $user->id);
                    });
            });
        }

        $specs = $query->latest()->paginate(20);

        $specs->getCollection()->transform(function ($spec) {
            $this->attachProfileAvatar($spec->owner);
            return $spec;
        });

        return $specs;
    }

    public function getOne($id, $user = null)
    {
        $query = Spec::with(['owner.profile', 'owner.media', 'requirements'])
            ->withCount(['applications', 'likes'])
            ->with(['applications' => function ($q) {
                $q->with('user.profile', 'user.media');
            }])
            ->with(['rounds' => function ($q) {
                $q->with('media')->orderBy('round_number', 'desc');
            }]);

        if ($user) {
            $query->withExists(['likes as is_liked' => function ($q) use ($user) {
                $q->where('user_id', $user->id);
            }]);
        }

        $spec = $query->find($id);

        if (!$spec || !$user) {
            return $spec;
        }

        if ((int) $spec->user_id === (int) $user->id) {
            $spec->rounds->load(['answers' => function ($q) {
                $q->whereNull('hidden_at');
            }]);
            $spec->rounds->load(['answers.user.profile', 'answers.user.media', 'answers.media']);

            return $spec;
        }

        $application = $spec->applications->firstWhere('user_id', $user->id);
        if ($application && $application->status === 'ELIMINATED') {
            $this->hideRoundsAfterElimination($spec, $user);
        }

        $spec->rounds->load(['answers' => function ($q) use ($user) {
            $q->where('user_id', $user->id)->whereNull('hidden_at');
        }]);
        $spec->rounds->load(['answers.media']);

        return $spec;
    }

    public function getOnePayload($id, $user = null): ?array
    {
        $spec = $this->getOne($id, $user);

        if (!$spec) {
            return null;
        }

        return $this->specToPayload($spec);
    }

    public function getPendingRequests($user)
    {
        $applications = SpecApplication::query()
            ->whereHas('spec', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->where('status', 'PENDING')
            ->with(['spec:id,title,user_id', 'user.profile', 'user.media'])
            ->latest()
            ->get();

        return $applications->map(function ($app) {
            if ($app->user) {
                $this->attachProfileAvatar($app->user, [
                    'full_name' => $app->user->name,
                    'age' => null,
                ]);
            }

            return $app;
        });
    }

    private function hideRoundsAfterElimination(Spec $spec, $user): void
    {
        $eliminatedRound = SpecRoundAnswer::where('user_id', $user->id)
            ->where('is_eliminated', true)
            ->whereHas('round', fn ($q) => $q->where('spec_id', $spec->id))
            ->with('round')
            ->first();

        if (!$eliminatedRound || !$eliminatedRound->round) {
            return;
        }

        $maxRoundNumber = $eliminatedRound->round->round_number;
        $spec->setRelation(
            'rounds',
            $spec->rounds->filter(fn ($round) => $round->round_number <= $maxRoundNumber)->values()
        );
    }

    private function specToPayload(Spec $spec): array
    {
        $data = $spec->toArray();

        if (!empty($data['owner'])) {
            $data['owner']['profile'] = $this->profilePayloadWithAvatar(
                $data['owner']['profile'] ?? [],
                $spec->owner
            );
        }

        if (!empty($data['applications'])) {
            foreach ($spec->applications as $index => $application) {
                if (!isset($data['applications'][$index]['user'])) {
                    continue;
                }

                $applicationUser = $application->relationLoaded('user') ? $application->user : null;
                if (!$applicationUser) {
                    continue;
                }

                $data['applications'][$index]['user']['profile'] = $this->profilePayloadWithAvatar(
                    $data['applications'][$index]['user']['profile'] ?? [],
                    $applicationUser
                );
            }
        }

        if (!empty($data['rounds'])) {
            foreach ($spec->rounds as $roundIndex => $round) {
                if (!$round->relationLoaded('answers') || !isset($data['rounds'][$roundIndex]['answers'])) {
                    continue;
                }

                foreach ($round->answers as $answerIndex => $answer) {
                    if (!isset($data['rounds'][$roundIndex]['answers'][$answerIndex]['user'])) {
                        continue;
                    }

                    $answerUser = $answer->relationLoaded('user') ? $answer->user : null;
                    if (!$answerUser) {
                        continue;
                    }

                    $data['rounds'][$roundIndex]['answers'][$answerIndex]['user']['profile'] = $this->profilePayloadWithAvatar(
                        $data['rounds'][$roundIndex]['answers'][$answerIndex]['user']['profile'] ?? [],
                        $answerUser
                    );
                }
            }
        }

        return $data;
    }

    private function attachProfileAvatar($user, array $fallbackProfile = []): void
    {
        if (!$user) {
            return;
        }

        if (!$user->profile) {
            $user->profile = (object) $fallbackProfile;
        }

        $user->profile->avatar = $this->avatarUrl($user);
    }

    private function profilePayloadWithAvatar(array $profile, $user): array
    {
        $profile['avatar'] = $this->avatarUrl($user) ?? ($profile['avatar'] ?? null);

        return $profile;
    }

    private function avatarUrl($user): ?string
    {
        if (!$user || !$user->relationLoaded('media')) {
            return null;
        }

        $avatarMedia = $user->media
            ->where('type', 'avatar')
            ->filter(fn ($media) => $media->isShareable())
            ->sortByDesc('id')
            ->first();

        return $avatarMedia ? $avatarMedia->url : null;
    }
}
