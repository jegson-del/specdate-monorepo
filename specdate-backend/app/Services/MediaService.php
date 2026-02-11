<?php

namespace App\Services;

use App\Models\Media;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaService
{
    public const PROFILE_GALLERY_MAX = 6;

    /** Use S3 when configured (AWS credentials set), otherwise store in public disk so uploads work without S3. */
    private function getMediaDisk(): \Illuminate\Contracts\Filesystem\Filesystem
    {
        $driver = config('filesystems.default');
        $useS3 = $driver === 's3' && config('filesystems.disks.s3.key');
        return Storage::disk($useS3 ? 's3' : 'public');
    }

    private function getMediaUrl(string $fullPath, \Illuminate\Contracts\Filesystem\Filesystem $disk): string
    {
        $driver = config('filesystems.default');
        $useS3 = $driver === 's3' && config('filesystems.disks.s3.key');
        if ($useS3) {
            return $disk->url($fullPath);
        }
        return rtrim(config('app.url'), '/') . '/storage/' . ltrim($fullPath, '/');
    }

    /**
     * Upload a file for a user, or update an existing media row when media_id is provided.
     * Works with S3 or local public disk (no video conversion; S3 allows any file type).
     *
     * @param UploadedFile $file
     * @param User $user
     * @param string $type (avatar, profile_gallery, chat, proof, round_answer_image, round_answer_video)
     * @param int|null $mediaId When provided (and type is profile_gallery), update this row instead of creating. Keeps slot count at 6.
     * @return Media
     */
    public function uploadFile(UploadedFile $file, User $user, string $type, ?int $mediaId = null): Media
    {
        $extension = $file->getClientOriginalExtension() ?: 'bin';
        $filename = Str::uuid() . '.' . $extension;
        $path = "uploads/{$user->id}/{$type}";
        $fullPath = "{$path}/{$filename}";

        $disk = $this->getMediaDisk();
        $useS3 = config('filesystems.default') === 's3' && config('filesystems.disks.s3.key');
        $options = $useS3 ? ['visibility' => 'public', 'ACL' => 'public-read'] : [];

        // Update-by-id: replace file and url for existing row (avatar or profile_gallery). No media_id = new image.
        if ($mediaId !== null) {
            $allowedTypes = ['avatar', 'profile_gallery'];
            if (!in_array($type, $allowedTypes, true)) {
                throw new \InvalidArgumentException('media_id is only supported for avatar or profile_gallery.');
            }
            $media = Media::where('id', $mediaId)->where('user_id', $user->id)->where('type', $type)->firstOrFail();
            $disk->delete($media->file_path);
            $disk->putFileAs($path, $file, $filename, $options);
            $url = $this->getMediaUrl($fullPath, $disk);
            $media->update([
                'file_path' => $fullPath,
                'url' => $url,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);
            return $media->fresh();
        }

        // Avatar (new): delete previous avatar(s) so only one exists (S3 + DB)
        if ($type === 'avatar') {
            Media::where('user_id', $user->id)->where('type', 'avatar')->get()->each(fn (Media $old) => $this->deleteMedia($old));
        }

        // Profile gallery: enforce max 6 — remove oldest if at capacity before creating
        if ($type === 'profile_gallery') {
            $current = Media::where('user_id', $user->id)->where('type', 'profile_gallery')->orderBy('id')->get();
            if ($current->count() >= self::PROFILE_GALLERY_MAX) {
                $oldest = $current->first();
                if ($oldest) {
                    $this->deleteMedia($oldest);
                }
            }
        }

        $disk->putFileAs($path, $file, $filename, $options);
        $url = $this->getMediaUrl($fullPath, $disk);

        return Media::create([
            'user_id' => $user->id,
            'file_path' => $fullPath,
            'url' => $url,
            'type' => $type,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);
    }

    /**
     * Delete a media item.
     * 
     * @param Media $media
     * @return bool
     */
    public function deleteMedia(Media $media): bool
    {
        $disk = $this->getMediaDisk();
        if ($disk->exists($media->file_path)) {
            $disk->delete($media->file_path);
        }
        return $media->delete();
    }
}
