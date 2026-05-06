<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecNotificationLog extends Model
{
    protected $fillable = [
        'spec_id',
        'user_id',
        'type',
        'reminder_key',
        'channels',
        'sent_at',
    ];

    protected $casts = [
        'channels' => 'array',
        'sent_at' => 'datetime',
    ];
}
