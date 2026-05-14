<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReporterRiskScore extends Model
{
    protected $fillable = [
        'user_id',
        'false_report_count',
        'valid_report_count',
        'risk_score',
        'last_false_report_at',
        'last_valid_report_at',
    ];

    protected $casts = [
        'false_report_count' => 'integer',
        'valid_report_count' => 'integer',
        'risk_score' => 'integer',
        'last_false_report_at' => 'datetime',
        'last_valid_report_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
