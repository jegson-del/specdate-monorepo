<?php

namespace App\Services;

use App\Models\Spec;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SpecMutationService
{
    public function __construct(private UserCreditService $credits)
    {
    }

    public function createSpec(array $data, $user): Spec
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

            $this->credits->debitCredit(
                $user,
                "Created Spec: {$spec->title}",
                ['spec_id' => $spec->id, 'action' => 'create_spec']
            );

            $spec->applications()->create([
                'user_id' => $user->id,
                'user_role' => 'owner',
                'status' => 'ACCEPTED',
            ]);

            if (!empty($data['requirements'])) {
                $this->replaceRequirements($spec, $data['requirements']);
            }

            DB::commit();

            return $spec->load('requirements');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Spec creation failed: ' . $e->getMessage());
            throw $e;
        }
    }

    public function updateSpec($user, $id, array $data): Spec
    {
        $spec = Spec::findOrFail($id);

        if ($spec->user_id !== $user->id) {
            throw new HttpException(403, 'You are not the owner of this spec.');
        }

        if ($spec->status !== 'OPEN') {
            throw new HttpException(400, 'This spec quest has already started or closed, so it can no longer be edited.');
        }

        if (isset($data['status']) && !in_array($data['status'], ['OPEN', 'COMPLETED'], true)) {
            throw new HttpException(400, 'Status can only be changed to open or completed from the edit screen.');
        }

        if (isset($data['status'])) {
            $spec->status = $data['status'];
        }

        if (isset($data['requirements'])) {
            $this->replaceRequirements($spec, $data['requirements']);
        }

        $spec->fill($data);
        $spec->save();

        return $spec->load('requirements');
    }

    private function replaceRequirements(Spec $spec, array $requirements): void
    {
        $spec->requirements()->delete();

        foreach ($requirements as $req) {
            $spec->requirements()->create([
                'field' => $req['field'],
                'operator' => $req['operator'] ?? '=',
                'value' => is_array($req['value']) ? json_encode($req['value']) : $req['value'],
                'is_compulsory' => $req['is_compulsory'] ?? false,
            ]);
        }
    }

}
