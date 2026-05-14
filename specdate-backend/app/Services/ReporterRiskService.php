<?php

namespace App\Services;

use App\Models\IpRiskEvent;
use App\Models\Report;
use App\Models\ReporterRiskScore;
use Illuminate\Support\Facades\DB;

class ReporterRiskService
{
    private const FALSE_REPORT_RISK_POINTS = 10;
    private const VALID_REPORT_RISK_REDUCTION = 2;
    private const FALSE_REPORT_EVENT_THRESHOLD = 3;

    public function __construct(private IpRiskService $ipRisk)
    {
    }

    public function applyReviewOutcome(Report $report): ?ReporterRiskScore
    {
        if ($report->reporter_score_applied_at || ! $report->reporter_id) {
            return null;
        }

        if ($report->status === 'dismissed') {
            return $this->recordFalseReport($report);
        }

        if ($report->status === 'resolved' && $report->action && $report->action !== 'none') {
            return $this->recordValidReport($report);
        }

        return null;
    }

    private function recordFalseReport(Report $report): ReporterRiskScore
    {
        return DB::transaction(function () use ($report) {
            $score = ReporterRiskScore::query()
                ->where('user_id', $report->reporter_id)
                ->lockForUpdate()
                ->first();

            if (! $score) {
                $score = ReporterRiskScore::create(['user_id' => $report->reporter_id]);
                $score->refresh();
            }

            $score->forceFill([
                'false_report_count' => $score->false_report_count + 1,
                'risk_score' => $score->risk_score + self::FALSE_REPORT_RISK_POINTS,
                'last_false_report_at' => now(),
            ])->save();

            $report->forceFill([
                'reporter_score_outcome' => 'dismissed_false_report',
                'reporter_score_applied_at' => now(),
            ])->save();

            if ($score->false_report_count >= self::FALSE_REPORT_EVENT_THRESHOLD && $report->reporter_ip_address) {
                $this->ipRisk->recordEvent(
                    $report->reporter_id,
                    $report->reporter_ip_address,
                    IpRiskEvent::EVENT_FALSE_REPORT_PATTERN,
                    'PATCH',
                    "api/admin/reports/{$report->id}",
                    $report->reporter_user_agent,
                    [
                        'report_id' => $report->id,
                        'false_report_count' => $score->false_report_count,
                        'reporter_risk_score' => $score->risk_score,
                        'target_type' => $report->target_type,
                        'target_id' => $report->target_id,
                    ]
                );
            }

            return $score->fresh();
        });
    }

    private function recordValidReport(Report $report): ReporterRiskScore
    {
        return DB::transaction(function () use ($report) {
            $score = ReporterRiskScore::query()
                ->where('user_id', $report->reporter_id)
                ->lockForUpdate()
                ->first();

            if (! $score) {
                $score = ReporterRiskScore::create(['user_id' => $report->reporter_id]);
                $score->refresh();
            }

            $score->forceFill([
                'valid_report_count' => $score->valid_report_count + 1,
                'risk_score' => max(0, $score->risk_score - self::VALID_REPORT_RISK_REDUCTION),
                'last_valid_report_at' => now(),
            ])->save();

            $report->forceFill([
                'reporter_score_outcome' => 'actioned_valid_report',
                'reporter_score_applied_at' => now(),
            ])->save();

            return $score->fresh();
        });
    }
}
