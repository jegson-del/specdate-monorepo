<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminActivityEvent extends Model
{
    protected $fillable = [
        'type',
        'title',
        'body',
        'route',
        'source_type',
        'source_id',
        'metadata',
        'counts',
    ];

    protected $casts = [
        'metadata' => 'array',
        'counts' => 'array',
    ];
}
