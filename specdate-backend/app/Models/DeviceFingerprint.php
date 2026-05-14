<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceFingerprint extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'fingerprint_hash',
        'platform',
        'app_version',
        'device_model',
        'ip_address',
        'user_agent',
        'metadata',
        'first_seen_at',
        'last_seen_at',
        'last_authenticated_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'last_authenticated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
