<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IpRiskEvent extends Model
{
    public const EVENT_REPORT_RATE_LIMIT = 'report_rate_limit';
    public const EVENT_APPEAL_RATE_LIMIT = 'appeal_rate_limit';
    public const EVENT_FALSE_REPORT_PATTERN = 'false_report_pattern';
    public const EVENT_DUPLICATE_DEVICE_REGISTRATION = 'duplicate_device_registration';
    public const EVENT_REGISTRATION_IP_CLUSTER = 'registration_ip_cluster';

    public const SEVERITY_LOW = 'low';
    public const SEVERITY_MEDIUM = 'medium';
    public const SEVERITY_HIGH = 'high';

    protected $fillable = [
        'user_id',
        'ip_address',
        'event_type',
        'severity',
        'score',
        'method',
        'path',
        'user_agent',
        'metadata',
        'occurred_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
