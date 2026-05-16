<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class PublicUserDirectoryService
{
    /**
     * @param array{sex?: string|null, city?: string|null, country?: string|null, query?: string|null} $filters
     */
    public function listForUser(User $viewer, array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $perPage = max(1, min($perPage, 50));

        $query = $this->visibleUsersQuery($viewer)
            ->with(['profile', 'media'])
            ->latest();

        $sex = trim((string) ($filters['sex'] ?? ''));
        if ($sex !== '' && strcasecmp($sex, 'All') !== 0) {
            $query->whereHas('profile', fn ($q) => $q->where('sex', $sex));
        }

        $city = trim((string) ($filters['city'] ?? ''));
        if ($city !== '') {
            $query->whereHas('profile', fn ($q) => $q->where('city', 'like', "%{$city}%"));
        }

        $country = trim((string) ($filters['country'] ?? ''));
        if ($country !== '') {
            $query->whereHas('profile', fn ($q) => $q->where('country', 'like', "%{$country}%"));
        }

        $search = trim((string) ($filters['query'] ?? ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('profile', function ($profileQuery) use ($search) {
                        $profileQuery->where('full_name', 'like', "%{$search}%")
                            ->orWhere('city', 'like', "%{$search}%")
                            ->orWhere('country', 'like', "%{$search}%")
                            ->orWhere('occupation', 'like', "%{$search}%")
                            ->orWhere('job_title', 'like', "%{$search}%");
                    });
            });
        }

        return $query->paginate($perPage)->through(fn (User $user) => $this->formatUser($user));
    }

    /**
     * @param array{sex?: string|null, country?: string|null, query?: string|null} $filters
     * @return array{countries: array<int, array{name: string, code: string|null, count: int}>, cities: array<int, array{name: string, count: int}>}
     */
    public function filterOptionsForUser(User $viewer, array $filters): array
    {
        $profiles = UserProfile::query()
            ->whereHas('user', fn (Builder $query) => $this->applyVisibleUserConstraints($query, $viewer));

        $this->applyProfileOptionFilters($profiles, $filters);

        $countries = $this->groupProfileOptions(clone $profiles, 'country');

        $country = trim((string) ($filters['country'] ?? ''));
        if ($country !== '') {
            $profiles->where('country', $country);
        }

        return [
            'countries' => $countries,
            'cities' => $this->groupProfileOptions($profiles, 'city'),
        ];
    }

    private function visibleUsersQuery(User $viewer): Builder
    {
        $query = User::query();
        $this->applyVisibleUserConstraints($query, $viewer);

        return $query;
    }

    private function applyVisibleUserConstraints(Builder $query, User $viewer): void
    {
        $query
            ->where('id', '!=', $viewer->id)
            ->where('role', 'user')
            ->where('is_paused', false)
            ->whereDoesntHave('blockedUsers', fn ($q) => $q->where('blocked_id', $viewer->id))
            ->whereDoesntHave('blockedByUsers', fn ($q) => $q->where('blocker_id', $viewer->id));
    }

    /**
     * @param array{sex?: string|null, query?: string|null} $filters
     */
    private function applyProfileOptionFilters(Builder $profiles, array $filters): void
    {
        $sex = trim((string) ($filters['sex'] ?? ''));
        if ($sex !== '' && strcasecmp($sex, 'All') !== 0) {
            $profiles->where('sex', $sex);
        }

        $search = trim((string) ($filters['query'] ?? ''));
        if ($search !== '') {
            $profiles->where(function (Builder $query) use ($search) {
                $query->where('full_name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhere('country', 'like', "%{$search}%")
                    ->orWhere('occupation', 'like', "%{$search}%")
                    ->orWhere('job_title', 'like', "%{$search}%")
                    ->orWhereHas('user', fn (Builder $userQuery) => $userQuery->where('name', 'like', "%{$search}%"));
            });
        }
    }

    /**
     * @return array<int, array{name: string, count: int}>
     */
    private function groupProfileOptions(Builder $profiles, string $column): array
    {
        return $profiles
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->selectRaw($column === 'country' ? "{$column} as name, country_code as code, count(*) as count" : "{$column} as name, count(*) as count")
            ->groupBy($column, ...($column === 'country' ? ['country_code'] : []))
            ->orderBy($column)
            ->get()
            ->pipe(fn (Collection $rows) => $column === 'country' ? $this->mergeCountryOptions($rows) : $rows)
            ->map(function ($row) use ($column) {
                $payload = [
                    'name' => (string) $row->name,
                    'count' => (int) $row->count,
                ];

                if ($column === 'country') {
                    $payload['code'] = $this->countryCode((string) $row->name, $row->code ?? null);
                }

                return $payload;
            })
            ->values()
            ->all();
    }

    private function mergeCountryOptions(Collection $rows): Collection
    {
        return $rows
            ->groupBy(fn ($row) => strtolower(trim((string) $row->name)))
            ->map(function (Collection $group) {
                $first = $group->first();
                $first->count = $group->sum(fn ($row) => (int) $row->count);
                $coded = $group->first(fn ($row) => !empty($row->code));
                $first->code = $coded?->code ?? $this->countryCode((string) $first->name);

                return $first;
            })
            ->sortBy('name')
            ->values();
    }

    private function countryCode(string $country, ?string $existing = null): ?string
    {
        $existing = strtoupper(trim((string) $existing));
        if (preg_match('/^[A-Z]{2}$/', $existing)) {
            return $existing;
        }

        $country = strtolower(trim($country));

        return [
            'australia' => 'AU',
            'belgium' => 'BE',
            'canada' => 'CA',
            'denmark' => 'DK',
            'france' => 'FR',
            'germany' => 'DE',
            'ghana' => 'GH',
            'india' => 'IN',
            'ireland' => 'IE',
            'italy' => 'IT',
            'kenya' => 'KE',
            'netherlands' => 'NL',
            'new zealand' => 'NZ',
            'nigeria' => 'NG',
            'norway' => 'NO',
            'portugal' => 'PT',
            'south africa' => 'ZA',
            'spain' => 'ES',
            'sweden' => 'SE',
            'united kingdom' => 'GB',
            'uk' => 'GB',
            'great britain' => 'GB',
            'england' => 'GB',
            'united states' => 'US',
            'united states of america' => 'US',
            'usa' => 'US',
            'us' => 'US',
        ][$country] ?? null;
    }

    /**
     * @return array<string, mixed>
     */
    private function formatUser(User $user): array
    {
        $profile = $user->profile;
        $avatarMedia = $user->media
            ->where('type', 'avatar')
            ->whereNull('hidden_at')
            ->filter(fn ($media) => $media->isShareable())
            ->sortByDesc('id')
            ->first();

        return [
            'id' => $user->id,
            'name' => $profile?->full_name ?: $user->name,
            'age' => $profile?->dob?->age,
            'city' => $profile?->city,
            'state' => $profile?->state,
            'country' => $profile?->country,
            'country_code' => $this->countryCode((string) $profile?->country, $profile?->country_code),
            'occupation' => $profile?->occupation,
            'job_title' => $profile?->job_title,
            'avatar' => $avatarMedia?->url ?? $profile?->avatar,
            'sex' => $profile?->sex,
        ];
    }
}
