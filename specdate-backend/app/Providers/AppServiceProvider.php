<?php

namespace App\Providers;

use App\Models\IpRiskEvent;
use App\Services\IpRiskService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('reports', function (Request $request) {
            $key = $this->rateLimitKey($request, 'reports');

            return [
                Limit::perMinute(10)->by($key)->response(
                    fn (Request $request, array $headers) => $this->rateLimitedResponse(
                        $request,
                        $headers,
                        IpRiskEvent::EVENT_REPORT_RATE_LIMIT,
                        'Too many reports submitted. Please wait before reporting again.',
                        ['limit' => 'reports_per_minute']
                    )
                ),
                Limit::perHour(40)->by($key)->response(
                    fn (Request $request, array $headers) => $this->rateLimitedResponse(
                        $request,
                        $headers,
                        IpRiskEvent::EVENT_REPORT_RATE_LIMIT,
                        'Too many reports submitted. Please wait before reporting again.',
                        ['limit' => 'reports_per_hour']
                    )
                ),
            ];
        });

        RateLimiter::for('moderation-appeals', function (Request $request) {
            return Limit::perHour(5)
                ->by($this->rateLimitKey($request, 'moderation-appeals'))
                ->response(
                    fn (Request $request, array $headers) => $this->rateLimitedResponse(
                        $request,
                        $headers,
                        IpRiskEvent::EVENT_APPEAL_RATE_LIMIT,
                        'Too many appeals submitted. Please wait before submitting another appeal.',
                        ['limit' => 'appeals_per_hour']
                    )
                );
        });
    }

    private function rateLimitKey(Request $request, string $scope): string
    {
        return implode('|', [
            $scope,
            $request->user()?->id ?: 'guest',
            $request->ip(),
        ]);
    }

    private function rateLimitedResponse(
        Request $request,
        array $headers,
        string $eventType,
        string $message,
        array $metadata
    ) {
        app(IpRiskService::class)->recordRateLimitHit($request, $eventType, $metadata);

        return response()->json(['message' => $message], 429, $headers);
    }
}
