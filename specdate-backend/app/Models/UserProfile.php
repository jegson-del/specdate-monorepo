<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $fillable = [
        'user_id',
        'latitude', 'longitude', 'city', 'state', 'country', 'continent',
        'dob', 'full_name', 'city', 'hobbies',
        'sex', 'occupation', 'qualification', 'sexual_orientation',
        'is_smoker', 'is_drug_user',
    ];

    protected $casts = [
        'dob' => 'date',
        'hobbies' => 'array',
        'is_smoker' => 'boolean',
        'is_drug_user' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
