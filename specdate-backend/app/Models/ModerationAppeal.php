<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModerationAppeal extends Model
{
    public const STATUS_OPEN = 'open';
    public const STATUS_UNDER_REVIEW = 'under_review';
    public const STATUS_GRANTED = 'granted';
    public const STATUS_DENIED = 'denied';
    public const STATUS_CLOSED = 'closed';

    public const ACTIVE_STATUSES = [
        self::STATUS_OPEN,
        self::STATUS_UNDER_REVIEW,
    ];

    public const DECISION_STATUSES = [
        self::STATUS_GRANTED,
        self::STATUS_DENIED,
    ];

    protected $fillable = [
        'user_id',
        'case_id',
        'action_id',
        'status',
        'appeal_text',
        'reviewed_by_user_id',
        'decision_note',
        'submitted_at',
        'reviewed_at',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(ModerationCase::class, 'case_id');
    }

    public function action(): BelongsTo
    {
        return $this->belongsTo(ModerationAction::class, 'action_id');
    }

    public function reviewedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }
}
