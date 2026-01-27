<?php

namespace App\Services;

use App\Models\Media;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaService
{
    /**
     * Upload a file for a user.
     * 
     * @param UploadedFile $file
     * @param User $user
     * @param string $type (avatar, profile_gallery, chat, proof)
     * @return Media
     */
    public function uploadFile(UploadedFile $file, User $user, string $type): Media
    {
        // 1. Generate unique filename
        $extension = $file->getClientOriginalExtension();
        $filename = Str::uuid() . '.' . $extension;
        
        // 2. Define path (e.g. uploads/{user_id}/{type}/{filename})
        // Grouping by user/type keeps S3 bucket organized
        $path = "uploads/{$user->id}/{$type}";
        $fullPath = "{$path}/{$filename}";

        // 3. Upload to S3
        // 's3' disk must be configured in filesystems.php
        Storage::disk('s3')->putFileAs($path, $file, $filename, 'public');

        // 4. Handle specific logic based on type
        if ($type === 'avatar') {
            // Optional: Mark old avatars as inactive or delete them
            // For now, we just let them accumulate or could soft-delete logic here
        }

        // 5. Create DB Record
        $media = Media::create([
            'user_id' => $user->id,
            'file_path' => $fullPath,
            'type' => $type,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);

        return $media;
    }

    /**
     * Delete a media item.
     * 
     * @param Media $media
     * @return bool
     */
    public function deleteMedia(Media $media): bool
    {
        // Delete from S3
        Storage::disk('s3')->delete($media->file_path);
        
        // Delete from DB
        return $media->delete();
    }
}
