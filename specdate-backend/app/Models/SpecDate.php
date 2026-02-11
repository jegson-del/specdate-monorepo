<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecDate extends Model
{
    protected $fillable = [
        'spec_id',
        'owner_id',
        'winner_user_id',
        'date_code',
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
}
