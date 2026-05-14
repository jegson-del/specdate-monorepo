<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountCanAct
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || $user->role === 'admin') {
            return $next($request);
        }

        if ($user->banned_at || $user->moderation_status === 'permanently_banned') {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been banned.',
            ], 403);
        }

        if ($user->is_paused
            || $user->moderation_status === 'suspended'
            || ($user->suspended_until && $user->suspended_until->isFuture())) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is temporarily suspended.',
            ], 403);
        }

        return $next($request);
    }
}
