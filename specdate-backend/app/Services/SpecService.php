<?php

namespace App\Services;

use App\Models\Spec;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SpecService
{
    public function listForFeed($user, string $filter = 'LIVE', bool $excludeOwn = false)
    {
        $filter = strtoupper(trim($filter));

        $query = Spec::query()
            ->with(['owner.profile', 'requirements'])
            ->withCount('applications')
            ->where('status', 'OPEN')
            ->where('expires_at', '>', now());

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
                // Newly created specs
                $query->where('created_at', '>=', now()->subDays(2));
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

    public function listMine($user)
    {
        // Include specs the user owns OR has applied to.
        return Spec::query()
            ->with(['requirements', 'owner.profile'])
            ->withCount('applications')
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereHas('applications', function ($a) use ($user) {
                        $a->where('user_id', $user->id);
                    });
            })
            ->latest()
            ->paginate(20);
    }

    public function getOne($id)
    {
        return Spec::with(['owner.profile', 'requirements'])
            ->withCount('applications')
            ->find($id);
    }

    public function join($user, $id): void
    {
        $spec = Spec::findOrFail($id);

        if ($spec->user_id === $user->id) {
            throw new HttpException(400, 'You cannot join your own spec.');
        }

        $existing = $spec->applications()->where('user_id', $user->id)->first();
        if ($existing) {
            throw new HttpException(400, 'You have already applied to this spec.');
        }

        $spec->applications()->create([
            'user_id' => $user->id,
            'user_role' => 'participant',
            'status' => 'PENDING',
        ]);
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
}
