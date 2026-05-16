<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminInvite extends Model
{
    protected $fillable = [
        'name',
        'email',
        'token_hash',
        'invited_by',
        'expires_at',
        'email_verified_at',
        'registered_user_id',
        'approved_at',
        'approved_by',
        'revoked_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'email_verified_at' => 'datetime',
        'approved_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function inviter()
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    public function registeredUser()
    {
        return $this->belongsTo(User::class, 'registered_user_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
