<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Media extends Model
{
    protected $fillable = [
        'user_id',
        'file_path',
        'type',
        'mime_type',
        'size',
    ];

    /**
     * Get the optimized URL via ImageKit.
     * 
     * @param array $transformations e.g. ['w' => 300, 'h' => 300]
     */
    public function getUrl(array $transformations = []): string
    {
        // Base ImageKit URL from .env, e.g., https://ik.imagekit.io/your_id/
        $baseUrl = rtrim(config('services.imagekit.url', env('IMAGEKIT_URL_ENDPOINT')), '/');
        
        // The file path in S3 is the same relative path for ImageKit (if configured as origin)
        $path = ltrim($this->file_path, '/');
        
        $url = "{$baseUrl}/{$path}";

        if (!empty($transformations)) {
            // Simple transformation string builder: tr=w-300,h-300
            $params = [];
            foreach ($transformations as $key => $value) {
                $params[] = "{$key}-{$value}";
            }
            $url .= '?tr=' . implode(',', $params);
        }

        return $url;
    }

    /**
     * Accessor for full URL (default, no transformations).
     * Usage: $media->url
     */
    public function getUrlAttribute(): string
    {
        return $this->getUrl();
    }
}
