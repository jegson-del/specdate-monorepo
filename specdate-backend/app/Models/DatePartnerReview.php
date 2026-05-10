<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DatePartnerReview extends Model
{
    protected $fillable = [
        'spec_date_id',
        'date_voucher_id',
        'reviewer_id',
        'reviewed_user_id',
        'rating',
        'chemistry_rating',
        'safety_rating',
        'would_meet_again',
        'comment',
    ];

    protected $casts = [
        'would_meet_again' => 'boolean',
    ];

    public function dateVoucher()
    {
        return $this->belongsTo(DateVoucher::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function reviewedUser()
    {
        return $this->belongsTo(User::class, 'reviewed_user_id');
    }
}
