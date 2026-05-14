<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModerationCase extends Model
{
    public const SOURCE_REPORT = 'report';
    public const SOURCE_AI_MEDIA = 'ai_media';
    public const SOURCE_ADMIN = 'admin';
    public const SOURCE_SYSTEM = 'system';

    public const STATUS_OPEN = 'open';
    public const STATUS_UNDER_REVIEW = 'under_review';
    public const STATUS_ACTIONED = 'actioned';
    public const STATUS_DISMISSED = 'dismissed';
    public const STATUS_APPEALED = 'appealed';
    public const STATUS_CLOSED = 'closed';

    public const SEVERITY_LOW = 'low';
    public const SEVERITY_MEDIUM = 'medium';
    public const SEVERITY_HIGH = 'high';
    public const SEVERITY_CRITICAL = 'critical';

    protected $fillable = [
        'subject_user_id',
        'opened_by_user_id',
        'assigned_admin_id',
        'source',
        'target_type',
        'target_id',
        'severity',
        'status',
        'summary',
        'evidence',
        'opened_at',
        'closed_at',
    ];

    protected $casts = [
        'evidence' => 'array',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function subjectUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subject_user_id');
    }

    public function openedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'opened_by_user_id');
    }

    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_admin_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(ModerationAction::class, 'case_id');
    }

    public function strikes(): HasMany
    {
        return $this->hasMany(ModerationStrike::class, 'case_id');
    }
}
