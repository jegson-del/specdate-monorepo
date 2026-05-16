<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProviderInvite extends Model
{
    protected $fillable = [
        'provider_name',
        'email',
        'service_type',
        'personal_message',
        'token_hash',
        'invited_by',
        'expires_at',
        'accepted_at',
        'revoked_at',
        'created_provider_profile_id',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function inviter()
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function providerProfile()
    {
        return $this->belongsTo(ProviderProfile::class, 'created_provider_profile_id');
    }
}
