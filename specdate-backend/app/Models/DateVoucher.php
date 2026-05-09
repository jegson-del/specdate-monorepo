<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DateVoucher extends Model
{
    public const STATUS_PENDING_PROVIDER = 'pending_provider';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_REDEEMED = 'redeemed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'spec_date_id',
        'provider_profile_id',
        'owner_id',
        'winner_user_id',
        'requested_by_user_id',
        'voucher_code',
        'qr_token',
        'discount_percentage',
        'minimum_spend',
        'booking_required',
        'status',
        'provider_decision_at',
        'provider_decision_by',
        'redeemed_at',
        'redeemed_by_provider_user_id',
        'expires_at',
        'cancelled_at',
    ];

    protected $casts = [
        'booking_required' => 'boolean',
        'minimum_spend' => 'decimal:2',
        'provider_decision_at' => 'datetime',
        'redeemed_at' => 'datetime',
        'expires_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function specDate()
    {
        return $this->belongsTo(SpecDate::class);
    }

    public function providerProfile()
    {
        return $this->belongsTo(ProviderProfile::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function winner()
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function redeemedByProvider()
    {
        return $this->belongsTo(User::class, 'redeemed_by_provider_user_id');
    }
}
