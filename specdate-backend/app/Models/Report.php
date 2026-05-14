<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    public const TARGETS = [
        'user',
        'message',
        'media',
        'profile',
        'provider_profile',
        'provider_review',
        'date_partner_review',
        'spec',
        'round_answer',
    ];
    public const STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'];
    public const ACTIONS = ['none', 'hide_content', 'suspend_user', 'delete_media'];

    protected $fillable = [
        'reporter_id',
        'reporter_ip_address',
        'reporter_user_agent',
        'reported_user_id',
        'target_type',
        'target_id',
        'reason',
        'details',
        'status',
        'action',
        'action_note',
        'reviewed_by',
        'reviewed_at',
        'reporter_score_outcome',
        'reporter_score_applied_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'reporter_score_applied_at' => 'datetime',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function reportedUser()
    {
        return $this->belongsTo(User::class, 'reported_user_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
