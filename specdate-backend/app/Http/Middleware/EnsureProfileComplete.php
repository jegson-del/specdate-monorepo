<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProfileComplete
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->profile || !$user->profile->profile_completed_at) {
            return response()->json([
                'message' => 'Profile incomplete. Please complete your profile to continue.',
                'code' => 'PROFILE_INCOMPLETE'
            ], 403);
        }

        return $next($request);
    }
}
