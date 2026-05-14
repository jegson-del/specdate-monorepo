<?php

namespace App\Services;

use App\Jobs\ProcessMediaModerationJob;
use App\Models\Media;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaService
{
    public const PROFILE_GALLERY_MAX = 6;

    public function __construct(
        private readonly MediaModerationService $mediaModerationService,
    ) {}

    /** Use S3 when configured (AWS credentials set), otherwise store in public disk so uploads work without S3. */
    private function getMediaDisk(): \Illuminate\Contracts\Filesystem\Cloud
    {
        $driver = config('filesystems.default');
        $useS3 = $driver === 's3' && config('filesystems.disks.s3.key');

        return Storage::disk($useS3 ? 's3' : 'public');
    }

    private function getMediaUrl(string $fullPath, \Illuminate\Contracts\Filesystem\Cloud $disk): string
    {
        $driver = config('filesystems.default');
        $useS3 = $driver === 's3' && config('filesystems.disks.s3.key');
        if ($useS3) {
            return $disk->url($fullPath);
        }

        return rtrim(config('app.url'), '/').'/storage/'.ltrim($fullPath, '/');
    }

    /**
     * Upload a file for a user, or update an existing media row when media_id is provided.
     * Works with S3 or local public disk (no video conversion; S3 allows any file type).
     *
     * @param  string  $type  (avatar, profile_gallery, provider_gallery, chat, chat_image, chat_video, chat_audio, proof, round_answer_image, round_answer_video, round_question_image, round_question_video, round_answer_audio, round_question_audio)
     * @param  int|null  $mediaId  When provided for supported profile/provider image types, update this row instead of creating.
     */
    public function uploadFile(UploadedFile $file, User $user, string $type, ?int $mediaId = null): Media
    {
        $extension = $file->getClientOriginalExtension() ?: 'bin';
        $filename = Str::uuid().'.'.$extension;
        $path = "uploads/{$user->id}/{$type}";
        $fullPath = "{$path}/{$filename}";

        $disk = $this->getMediaDisk();
        $useS3 = config('filesystems.default') === 's3' && config('filesystems.disks.s3.key');
        $options = $useS3 ? ['visibility' => 'public', 'ACL' => 'public-read'] : [];

        // Update-by-id: replace file and url for existing profile/provider media. No media_id = new image.
        if ($mediaId !== null) {
            $allowedTypes = ['avatar', 'profile_gallery', 'provider_gallery'];
            if (! in_array($type, $allowedTypes, true)) {
                throw new \InvalidArgumentException('media_id is only supported for avatar, profile_gallery, or provider_gallery.');
            }
            $media = Media::where('id', $mediaId)->where('user_id', $user->id)->where('type', $type)->firstOrFail();
            $disk->delete($media->file_path);
            $disk->putFileAs($path, $file, $filename, $options);
            $url = $this->getMediaUrl($fullPath, $disk);
            $media->update(array_merge([
                'file_path' => $fullPath,
                'url' => $url,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ], $this->moderationAttributesForUpload($file)));
            $fresh = $media->fresh();
            if ($fresh !== null) {
                $this->queueRekognitionIfPending($fresh);
            }

            return $fresh ?? $media;
        }

        // Existing avatar/gallery rows stay visible until replacements pass moderation.

        $disk->putFileAs($path, $file, $filename, $options);
        $url = $this->getMediaUrl($fullPath, $disk);

        $media = Media::create(array_merge([
            'user_id' => $user->id,
            'file_path' => $fullPath,
            'url' => $url,
            'type' => $type,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ], $this->moderationAttributesForUpload($file)));

        $this->queueRekognitionIfPending($media);

        return $media;
    }

    /**
     * Delete a media item.
     */
    public function deleteMedia(Media $media): bool
    {
        $disk = $this->getMediaDisk();
        if ($disk->exists($media->file_path)) {
            $disk->delete($media->file_path);
        }

        return $media->delete();
    }

    /**
     * @return array<string, mixed>
     */
    private function moderationAttributesForUpload(UploadedFile $file): array
    {
        $mime = $file->getMimeType();

        return [
            'moderation_status' => $this->mediaModerationService->initialStatusForMime($mime),
            'moderation_labels' => $this->mediaModerationService->initialLabelsForMime($mime),
            'rekognition_job_id' => null,
            'moderation_checked_at' => null,
            'moderation_error' => null,
        ];
    }

    private function queueRekognitionIfPending(Media $media): void
    {
        if ($media->moderation_status !== 'pending') {
            return;
        }
        $kind = $this->mediaModerationService->mediaKind($media->mime_type);
        if ($kind !== 'image' && $kind !== 'video') {
            return;
        }
        if (! $this->mediaModerationService->usesS3() || ! $this->mediaModerationService->rekognitionEnabled()) {
            return;
        }
        ProcessMediaModerationJob::dispatch($media->id);
    }
}
