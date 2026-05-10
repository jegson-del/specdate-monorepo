<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProviderReview extends Model
{
    protected $fillable = [
        'provider_profile_id',
        'date_voucher_id',
        'reviewer_id',
        'rating',
        'comment',
    ];

    public function providerProfile()
    {
        return $this->belongsTo(ProviderProfile::class);
    }

    public function dateVoucher()
    {
        return $this->belongsTo(DateVoucher::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
