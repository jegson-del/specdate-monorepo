<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProviderProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'company_name',
        'image',
        'description',
        'website',
        'phone',
        'address',
        'city',
        'country',
        'discount_percentage',
        'minimum_spend',
        'booking_required',
        'is_verified',
    ];

    protected $casts = [
        'booking_required' => 'boolean',
        'minimum_spend' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function categories()
    {
        return $this->belongsToMany(ProviderCategory::class, 'provider_category');
    }
}
