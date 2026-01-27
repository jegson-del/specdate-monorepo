<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Media extends Model
{
    protected $fillable = [
        'user_id',
        'file_path',
        'url',       // Full S3 public URL; stored at upload so mobile can show images
        'type',
        'mime_type',
        'size',
    ];

    /**
     * Get the public URL for this file.
     * Prefers stored url (set at upload). Falls back to S3 URL from file_path for older rows.
     *
     * @param array $transformations Reserved for future use (e.g. ImageKit resizing).
     */
    public function getUrl(array $transformations = []): string
    {
        $stored = $this->attributes['url'] ?? null;
        if ($stored !== null && $stored !== '') {
            return (string) $stored;
        }
        return Storage::disk('s3')->url($this->file_path);
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
        return Storage::disk('s3')->url($this->file_path);
    }
}
