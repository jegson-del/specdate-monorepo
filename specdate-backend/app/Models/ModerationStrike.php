<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModerationStrike extends Model
{
    public const CATEGORY_SPAM = 'spam';
    public const CATEGORY_HARASSMENT = 'harassment';
    public const CATEGORY_EXPLICIT_CONTENT = 'explicit_content';
    public const CATEGORY_FAKE_PROFILE = 'fake_profile';
    public const CATEGORY_SCAM = 'scam';
    public const CATEGORY_HATE_SPEECH = 'hate_speech';
    public const CATEGORY_UNSAFE_MEDIA = 'unsafe_media';
    public const CATEGORY_OTHER = 'other';

    public const CATEGORIES = [
        self::CATEGORY_SPAM,
        self::CATEGORY_HARASSMENT,
        self::CATEGORY_EXPLICIT_CONTENT,
        self::CATEGORY_FAKE_PROFILE,
        self::CATEGORY_SCAM,
        self::CATEGORY_HATE_SPEECH,
        self::CATEGORY_UNSAFE_MEDIA,
        self::CATEGORY_OTHER,
    ];

    public const SEVERITY_LOW = 'low';
    public const SEVERITY_MEDIUM = 'medium';
    public const SEVERITY_HIGH = 'high';

    public const SEVERITIES = [
        self::SEVERITY_LOW,
        self::SEVERITY_MEDIUM,
        self::SEVERITY_HIGH,
    ];

    protected $fillable = [
        'user_id',
        'case_id',
        'report_id',
        'issued_by_user_id',
        'strike_number',
        'category',
        'severity',
        'reason',
        'evidence',
        'active',
        'expires_at',
        'revoked_at',
        'revoked_by_user_id',
        'revocation_reason',
    ];

    protected $casts = [
        'evidence' => 'array',
        'active' => 'boolean',
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(ModerationCase::class, 'case_id');
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    public function issuedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_user_id');
    }

    public function revokedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by_user_id');
    }
}
