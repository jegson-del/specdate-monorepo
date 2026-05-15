<?php

namespace App\Services;

use App\Models\SuccessStory;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AdminSuccessStoryService
{
    public function __construct(private AdminAccessService $adminAccessService) {}

    public function list(User $admin, ?string $status = null, int $perPage = 25): LengthAwarePaginator
    {
        $this->ensureCanManageStories($admin);
        $perPage = max(1, min($perPage, 100));

        $stories = SuccessStory::query()
            ->with('provider:id,company_name,city,country')
            ->when($status && in_array($status, SuccessStory::STATUSES, true), fn ($query) => $query->where('status', $status))
            ->orderByDesc('is_featured')
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $stories->getCollection()->transform(fn (SuccessStory $story) => $this->payload($story));

        return $stories;
    }

    public function create(User $admin, array $data): array
    {
        $this->ensureCanManageStories($admin);

        $story = SuccessStory::create($this->normalizeData($data));

        return $this->payload($story->fresh('provider:id,company_name,city,country'));
    }

    public function update(User $admin, int $storyId, array $data): array
    {
        $this->ensureCanManageStories($admin);

        $story = SuccessStory::query()->findOrFail($storyId);
        $story->fill($this->normalizeData($data, $story))->save();

        return $this->payload($story->fresh('provider:id,company_name,city,country'));
    }

    public function delete(User $admin, int $storyId): void
    {
        $this->ensureCanManageStories($admin);

        SuccessStory::query()->findOrFail($storyId)->delete();
    }

    public function validationRules(bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'provider_profile_id' => ['nullable', 'integer', 'exists:provider_profiles,id'],
            'title' => [$required, 'string', 'min:3', 'max:140'],
            'body' => [$required, 'string', 'min:10', 'max:4000'],
            'attribution' => ['nullable', 'string', 'max:120'],
            'location' => ['nullable', 'string', 'max:160'],
            'story_type' => ['sometimes', 'string', 'max:40'],
            'image_url' => ['nullable', 'url', 'max:2048'],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'status' => ['sometimes', 'string', 'in:' . implode(',', SuccessStory::STATUSES)],
            'is_featured' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'published_at' => ['nullable', 'date'],
        ];
    }

    private function normalizeData(array $data, ?SuccessStory $existingStory = null): array
    {
        $status = $data['status'] ?? $existingStory?->status ?? SuccessStory::STATUS_DRAFT;
        $publishedAt = array_key_exists('published_at', $data)
            ? $data['published_at']
            : $existingStory?->published_at;

        if ($status === SuccessStory::STATUS_PUBLISHED && ! $publishedAt) {
            $publishedAt = now();
        }

        return [
            'provider_profile_id' => $data['provider_profile_id'] ?? $existingStory?->provider_profile_id,
            'title' => isset($data['title']) ? trim($data['title']) : $existingStory?->title,
            'body' => isset($data['body']) ? trim($data['body']) : $existingStory?->body,
            'attribution' => array_key_exists('attribution', $data) ? $this->nullableTrim($data['attribution']) : $existingStory?->attribution,
            'location' => array_key_exists('location', $data) ? $this->nullableTrim($data['location']) : $existingStory?->location,
            'story_type' => isset($data['story_type']) ? trim($data['story_type']) : ($existingStory?->story_type ?? 'date'),
            'image_url' => array_key_exists('image_url', $data) ? $this->nullableTrim($data['image_url']) : $existingStory?->image_url,
            'rating' => array_key_exists('rating', $data) ? $data['rating'] : $existingStory?->rating,
            'status' => $status,
            'is_featured' => array_key_exists('is_featured', $data) ? (bool) $data['is_featured'] : (bool) ($existingStory?->is_featured ?? false),
            'sort_order' => array_key_exists('sort_order', $data) ? (int) $data['sort_order'] : (int) ($existingStory?->sort_order ?? 0),
            'published_at' => $publishedAt,
        ];
    }

    private function payload(SuccessStory $story): array
    {
        return [
            'id' => $story->id,
            'provider_profile_id' => $story->provider_profile_id,
            'title' => $story->title,
            'body' => $story->body,
            'attribution' => $story->attribution,
            'location' => $story->location,
            'story_type' => $story->story_type,
            'image_url' => $story->image_url,
            'rating' => $story->rating !== null ? (int) $story->rating : null,
            'status' => $story->status,
            'is_featured' => (bool) $story->is_featured,
            'sort_order' => (int) $story->sort_order,
            'published_at' => $story->published_at,
            'created_at' => $story->created_at,
            'provider' => $story->provider ? [
                'id' => $story->provider->id,
                'name' => $story->provider->company_name,
                'city' => $story->provider->city,
                'country' => $story->provider->country,
            ] : null,
        ];
    }

    private function nullableTrim(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : null;
    }

    private function ensureCanManageStories(?User $admin): void
    {
        if (! $admin || $admin->role !== 'admin') {
            throw new HttpException(403, 'Admin access required.');
        }

        $this->adminAccessService->assertCan($admin, AdminAccessService::MANAGE_SUCCESS_STORIES);
    }
}
