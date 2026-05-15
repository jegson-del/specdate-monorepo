<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportTicket extends Model
{
    public const CATEGORIES = [
        'safety',
        'account',
        'payments',
        'moderation',
        'privacy',
        'technical',
        'provider',
        'other',
    ];

    public const STATUSES = [
        'open',
        'pending_admin',
        'pending_user',
        'resolved',
        'closed',
    ];

    protected $fillable = [
        'user_id',
        'contact_name',
        'contact_email',
        'contact_ip_address',
        'category',
        'subject',
        'status',
        'last_message_at',
        'resolved_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function messages()
    {
        return $this->hasMany(SupportMessage::class);
    }
}
