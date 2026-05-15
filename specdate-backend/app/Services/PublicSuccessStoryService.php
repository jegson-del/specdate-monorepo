<?php

namespace App\Services;

use App\Models\SuccessStory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PublicSuccessStoryService
{
    public function published(int $perPage = 6): LengthAwarePaginator
    {
        $perPage = max(1, min($perPage, 24));

        $stories = SuccessStory::query()
            ->with('provider:id,company_name,city,country')
            ->where('status', SuccessStory::STATUS_PUBLISHED)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('is_featured')
            ->orderBy('sort_order')
            ->orderByDesc('published_at')
            ->paginate($perPage);

        $stories->getCollection()->transform(fn (SuccessStory $story) => $this->payload($story));

        return $stories;
    }

    private function payload(SuccessStory $story): array
    {
        return [
            'id' => $story->id,
            'title' => $story->title,
            'body' => $story->body,
            'attribution' => $story->attribution ?: 'DateUsher member',
            'location' => $story->location,
            'storyType' => $story->story_type,
            'imageUrl' => $story->image_url,
            'rating' => $story->rating !== null ? (int) $story->rating : null,
            'isFeatured' => (bool) $story->is_featured,
            'publishedAt' => $story->published_at,
            'provider' => $story->provider ? [
                'id' => $story->provider->id,
                'name' => $story->provider->company_name,
                'city' => $story->provider->city,
                'country' => $story->provider->country,
            ] : null,
        ];
    }
}
