<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Media extends Model
{
    public const SHAREABLE_MODERATION_STATUSES = ['approved', 'manual_pending'];

    protected $fillable = [
        'user_id',
        'file_path',
        'url',       // Full S3 public URL; stored at upload so mobile can show images
        'type',
        'mime_type',
        'size',
        'hidden_at',
        'hidden_reason',
        'moderation_status',
        'moderation_labels',
        'rekognition_job_id',
        'moderation_checked_at',
        'moderation_error',
    ];

    protected $casts = [
        'hidden_at' => 'datetime',
        'moderation_labels' => 'array',
        'moderation_checked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'target_id')
            ->where('target_type', 'media');
    }

    public function isShareable(): bool
    {
        return $this->hidden_at === null
            && in_array($this->moderation_status, self::SHAREABLE_MODERATION_STATUSES, true);
    }

    /**
     * Get the public URL for this file.
     * Prefers stored url (set at upload). Falls back to S3 URL from file_path for older rows.
     *
     * @param  array  $transformations  Reserved for future use (e.g. ImageKit resizing).
     */
    public function getUrl(array $transformations = []): string
    {
        $stored = $this->attributes['url'] ?? null;
        if ($stored !== null && $stored !== '') {
            return (string) $stored;
        }
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('s3');

        return $disk->url($this->file_path);
    }

    /**
     * Accessor for full URL. Returns stored S3 url or computed from file_path for legacy rows.
     * Usage: $media->url
     */
    public function getUrlAttribute(): string
    {
        $stored = $this->attributes['url'] ?? null;
        if ($stored !== null && $stored !== '') {
            return (string) $stored;
        }
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('s3');

        return $disk->url($this->file_path);
    }
}
