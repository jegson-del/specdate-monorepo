<?php

namespace App\Http\Controllers;

use App\Services\AppVersionService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class AppVersionController extends Controller
{
    use ApiResponse;

    public function __construct(private AppVersionService $versions)
    {
    }

    public function show(Request $request)
    {
        $validated = $request->validate([
            'platform' => ['required', 'in:ios,android'],
            'version' => ['nullable', 'string', 'max:32'],
            'build' => ['nullable', 'string', 'max:32'],
        ]);

        return $this->sendResponse(
            $this->versions->status(
                $validated['platform'],
                $validated['version'] ?? null,
                $validated['build'] ?? null
            ),
            'App version status retrieved successfully.'
        );
    }
}
