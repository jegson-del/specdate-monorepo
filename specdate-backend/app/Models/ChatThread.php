<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatThread extends Model
{
    protected $fillable = [
        'type',
        'spec_date_id',
        'spec_id',
        'owner_id',
        'winner_user_id',
        'customer_id',
        'provider_id',
        'last_message_id',
        'last_message_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
    ];

    public function specDate()
    {
        return $this->belongsTo(SpecDate::class);
    }

    public function spec()
    {
        return $this->belongsTo(Spec::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function winner()
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function provider()
    {
        return $this->belongsTo(User::class, 'provider_id');
    }

    public function messages()
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function lastMessage()
    {
        return $this->belongsTo(ChatMessage::class, 'last_message_id');
    }

    public function hasParticipant(int $userId): bool
    {
        return (int) $this->owner_id === $userId || (int) $this->winner_user_id === $userId;
    }

    public function otherParticipantId(int $userId): int
    {
        return (int) $this->owner_id === $userId
            ? (int) $this->winner_user_id
            : (int) $this->owner_id;
    }
}
