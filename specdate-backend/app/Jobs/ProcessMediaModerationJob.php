<?php

namespace App\Jobs;

use App\Models\Media;
use App\Services\AdminNotificationService;
use App\Services\MediaModerationService;
use App\Services\ModerationCaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessMediaModerationJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $timeout = 120;

    public function __construct(public int $mediaId) {}

    public function handle(
        MediaModerationService $moderation,
        AdminNotificationService $adminNotifications,
        ModerationCaseService $moderationCases,
    ): void
    {
        $media = Media::query()->find($this->mediaId);
        if ($media === null) {
            return;
        }

        if (! in_array($media->moderation_status, ['pending', 'scanning'], true)) {
            return;
        }
        if ($moderation->mediaKind($media->mime_type) === 'audio') {
            return;
        }
        if (! $moderation->usesS3() || ! $moderation->rekognitionEnabled()) {
            return;
        }

        $kind = $moderation->mediaKind($media->mime_type);
        if ($kind !== 'image' && $kind !== 'video') {
            return;
        }

        $media->update([
            'moderation_status' => 'scanning',
            'moderation_error' => null,
        ]);

        try {
            if ($kind === 'image') {
                $result = $moderation->detectImageModeration($media->file_path);
                $media->update([
                    'moderation_labels' => [
                        'source' => 'rekognition_image',
                        'moderation_labels' => $result['labels'],
                    ],
                    'moderation_status' => $result['flagged'] ? 'flagged' : 'approved',
                    'moderation_checked_at' => now(),
                    'rekognition_job_id' => null,
                ]);
                if ($result['flagged']) {
                    $moderationCases->createFromMediaModeration(
                        $media->fresh(),
                        'rekognition_flagged',
                        'Upload flagged by Rekognition'
                    );
                    $adminNotifications->notifyMediaModerationCase(
                        $media->fresh(),
                        'rekognition_flagged',
                        'Upload flagged by Rekognition',
                        'A media upload needs admin review before it can be shown.'
                    );
                }

                return;
            }

            $jobId = $moderation->startVideoModeration($media->file_path);
            $media->update(['rekognition_job_id' => $jobId]);

            $delay = (int) config('services.rekognition.video_poll_delay_seconds', 15);
            PollRekognitionVideoModerationJob::dispatch($this->mediaId, 0)
                ->delay(now()->addSeconds($delay));
        } catch (\Throwable $e) {
            Log::error('ProcessMediaModerationJob failed', [
                'media_id' => $this->mediaId,
                'message' => $e->getMessage(),
            ]);
            $media->update([
                'moderation_status' => 'failed',
                'moderation_error' => $e->getMessage(),
                'moderation_checked_at' => now(),
            ]);
            $moderationCases->createFromMediaModeration(
                $media->fresh(),
                'rekognition_failed',
                'Upload moderation failed',
                ['error' => $e->getMessage()]
            );
            $adminNotifications->notifyMediaModerationCase(
                $media->fresh(),
                'rekognition_failed',
                'Upload moderation failed',
                'A media upload could not be scanned and needs admin review.'
            );
        }
    }
}
