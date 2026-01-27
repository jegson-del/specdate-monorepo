<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $fillable = [
        'user_id',
        'latitude', 'longitude', 'city', 'state', 'country', 'continent',
        'dob', 'full_name', 'hobbies',
        'sex', 'occupation', 'qualification', 'sexual_orientation',
        'height', 'ethnicity',
        'height', 'ethnicity',
        'is_smoker', 'is_drug_user', 'drinking',
        'profile_completed_at',
    ];

    protected $casts = [
        'dob' => 'date',
        'is_drug_user' => 'boolean',
        'is_smoker' => 'boolean',
        'height' => 'integer',
        'profile_completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
