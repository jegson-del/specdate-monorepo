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

class PollRekognitionVideoModerationJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $timeout = 120;

    public function __construct(
        public int $mediaId,
        public int $attempt = 0,
    ) {}

    public function handle(
        MediaModerationService $moderation,
        AdminNotificationService $adminNotifications,
        ModerationCaseService $moderationCases,
    ): void
    {
        $maxAttempts = (int) config('services.rekognition.video_poll_max_attempts', 80);
        if ($this->attempt >= $maxAttempts) {
            $media = Media::query()->find($this->mediaId);
            if ($media !== null) {
                $media->update([
                    'moderation_status' => 'failed',
                    'moderation_error' => 'Video moderation polling exceeded max attempts.',
                    'moderation_checked_at' => now(),
                ]);
                $moderationCases->createFromMediaModeration(
                    $media->fresh(),
                    'rekognition_stale_failed',
                    'Upload scan timed out'
                );
                $adminNotifications->notifyMediaModerationCase(
                    $media->fresh(),
                    'rekognition_stale_failed',
                    'Upload scan timed out',
                    'A video upload scan exceeded the polling limit and needs admin review.'
                );
            }

            return;
        }

        $media = Media::query()->find($this->mediaId);
        if ($media === null || $media->rekognition_job_id === null || $media->rekognition_job_id === '') {
            return;
        }

        try {
            $aggregate = $moderation->getVideoModerationAggregate($media->rekognition_job_id);
            $state = $aggregate['state'];

            if ($state === 'IN_PROGRESS') {
                $delay = (int) config('services.rekognition.video_poll_delay_seconds', 15);
                self::dispatch($this->mediaId, $this->attempt + 1)
                    ->delay(now()->addSeconds($delay));

                return;
            }

            if ($state === 'FAILED') {
                $media->update([
                    'moderation_status' => 'failed',
                    'moderation_error' => $aggregate['status_message'] ?? 'Rekognition video job failed.',
                    'moderation_checked_at' => now(),
                    'rekognition_job_id' => null,
                ]);
                $moderationCases->createFromMediaModeration(
                    $media->fresh(),
                    'rekognition_failed',
                    'Upload moderation failed',
                    ['status_message' => $aggregate['status_message'] ?? null]
                );
                $adminNotifications->notifyMediaModerationCase(
                    $media->fresh(),
                    'rekognition_failed',
                    'Upload moderation failed',
                    'A video upload could not be scanned and needs admin review.'
                );

                return;
            }

            if ($state !== 'SUCCEEDED') {
                $media->update([
                    'moderation_status' => 'failed',
                    'moderation_error' => 'Unexpected Rekognition job state: '.$state,
                    'moderation_checked_at' => now(),
                    'rekognition_job_id' => null,
                ]);
                $moderationCases->createFromMediaModeration(
                    $media->fresh(),
                    'rekognition_failed',
                    'Upload moderation failed',
                    ['state' => $state]
                );
                $adminNotifications->notifyMediaModerationCase(
                    $media->fresh(),
                    'rekognition_failed',
                    'Upload moderation failed',
                    'A video upload returned an unexpected scan state and needs admin review.'
                );

                return;
            }

            $flagMin = (float) config('services.rekognition.flag_min_confidence', 75);
            $final = $moderation->finalizeVideoLabels($aggregate['labels'], $flagMin);
            $media->update([
                'moderation_labels' => [
                    'source' => 'rekognition_video',
                    'moderation_labels' => $final['labels'],
                ],
                'moderation_status' => $final['flagged'] ? 'flagged' : 'approved',
                'moderation_checked_at' => now(),
                'rekognition_job_id' => null,
                'moderation_error' => null,
            ]);
            if ($final['flagged']) {
                $moderationCases->createFromMediaModeration(
                    $media->fresh(),
                    'rekognition_flagged',
                    'Upload flagged by Rekognition'
                );
                $adminNotifications->notifyMediaModerationCase(
                    $media->fresh(),
                    'rekognition_flagged',
                    'Upload flagged by Rekognition',
                    'A video upload needs admin review before it can be shown.'
                );
            }
        } catch (\Throwable $e) {
            Log::error('PollRekognitionVideoModerationJob failed', [
                'media_id' => $this->mediaId,
                'attempt' => $this->attempt,
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
                'A video upload could not be scanned and needs admin review.'
            );
        }
    }
}
