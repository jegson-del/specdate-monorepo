<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserTransaction extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'item_type',
        'quantity',
        'amount',
        'currency',
        'purpose',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
