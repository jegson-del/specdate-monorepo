<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReviewPromptDismissal extends Model
{
    protected $fillable = [
        'date_voucher_id',
        'user_id',
        'dismissed_at',
    ];

    protected $casts = [
        'dismissed_at' => 'datetime',
    ];
}
