<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Spec extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'description',
        'location_city', 'location_lat', 'location_lng',
        'expires_at',
        'max_participants',
        'status',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'location_lat' => 'decimal:8',
        'location_lng' => 'decimal:8',
    ];
    
    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function requirements()
    {
        return $this->hasMany(SpecRequirement::class);
    }

    public function applications()
    {
        return $this->hasMany(SpecApplication::class);
    }

    public function likes()
    {
        return $this->hasMany(SpecLike::class);
    }
}
