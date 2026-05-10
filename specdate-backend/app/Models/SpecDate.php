<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecDate extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'root_spec_date_id',
        'parent_spec_date_id',
        'spec_id',
        'owner_id',
        'winner_user_id',
        'scheduled_by_user_id',
        'date_code',
        'date_number',
        'status',
    ];

    public function spec()
    {
        return $this->belongsTo(Spec::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function winner()
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }

    public function rootDate()
    {
        return $this->belongsTo(SpecDate::class, 'root_spec_date_id');
    }

    public function parentDate()
    {
        return $this->belongsTo(SpecDate::class, 'parent_spec_date_id');
    }

    public function scheduledBy()
    {
        return $this->belongsTo(User::class, 'scheduled_by_user_id');
    }

    public function chatThread()
    {
        return $this->hasOne(ChatThread::class);
    }

    public function vouchers()
    {
        return $this->hasMany(DateVoucher::class);
    }
}
