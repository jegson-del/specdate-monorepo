<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SpecApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'spec_id',
        'user_id',
        'user_role', // owner, participant
        'status', // PENDING, ACCEPTED, REJECTED, ELIMINATED, WINNER
    ];

    public function spec()
    {
        return $this->belongsTo(Spec::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
