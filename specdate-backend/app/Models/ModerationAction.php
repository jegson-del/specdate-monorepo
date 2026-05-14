<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModerationAction extends Model
{
    public const ACTION_NO_ACTION = 'no_action';
    public const ACTION_WARNING = 'warning';
    public const ACTION_STRIKE = 'strike';
    public const ACTION_HIDE_CONTENT = 'hide_content';
    public const ACTION_TEMPORARY_SUSPENSION = 'temporary_suspension';
    public const ACTION_PERMANENT_BAN = 'permanent_ban';
    public const ACTION_UNBAN = 'unban';
    public const ACTION_STRIKE_REVOKED = 'strike_revoked';
    public const ACTION_APPEAL_GRANTED = 'appeal_granted';
    public const ACTION_APPEAL_DENIED = 'appeal_denied';

    protected $fillable = [
        'case_id',
        'user_id',
        'target_type',
        'target_id',
        'admin_id',
        'action',
        'reason',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function case(): BelongsTo
    {
        return $this->belongsTo(ModerationCase::class, 'case_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
