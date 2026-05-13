<?php

namespace App\Services;

use Aws\Rekognition\RekognitionClient;

class MediaModerationService
{
    public function usesS3(): bool
    {
        return config('filesystems.default') === 's3' && config('filesystems.disks.s3.key');
    }

    public function rekognitionEnabled(): bool
    {
        return (bool) config('services.rekognition.enabled', true);
    }

    public function mediaKind(?string $mime): string
    {
        if ($mime === null || $mime === '') {
            return 'unknown';
        }
        if (str_starts_with($mime, 'image/')) {
            return 'image';
        }
        if (str_starts_with($mime, 'video/')) {
            return 'video';
        }
        if (str_starts_with($mime, 'audio/')) {
            return 'audio';
        }

        return 'unknown';
    }

    public function initialStatusForMime(?string $mime): string
    {
        if ($this->mediaKind($mime) === 'audio') {
            return 'manual_pending';
        }
        if (! $this->usesS3() || ! $this->rekognitionEnabled()) {
            return 'approved';
        }
        if ($this->mediaKind($mime) === 'image' || $this->mediaKind($mime) === 'video') {
            return 'pending';
        }

        return 'approved';
    }

    /**
     * @return array<string, mixed>|null JSON-ready payload; null when Rekognition will fill later.
     */
    public function initialLabelsForMime(?string $mime): ?array
    {
        if ($this->mediaKind($mime) === 'audio') {
            return ['manual_review' => true];
        }
        if ($this->initialStatusForMime($mime) === 'approved') {
            return ['skipped' => true, 'reason' => $this->skipReason($mime)];
        }

        return null;
    }

    private function skipReason(?string $mime): string
    {
        if (! $this->usesS3()) {
            return 'not_s3_disk';
        }
        if (! $this->rekognitionEnabled()) {
            return 'rekognition_disabled';
        }
        if ($this->mediaKind($mime) === 'unknown') {
            return 'mime_not_scanned';
        }

        return 'unknown';
    }

    private function client(): RekognitionClient
    {
        return new RekognitionClient([
            'version' => 'latest',
            'region' => config('filesystems.disks.s3.region', config('services.ses.region', 'us-east-1')),
            'credentials' => [
                'key' => config('filesystems.disks.s3.key'),
                'secret' => config('filesystems.disks.s3.secret'),
            ],
        ]);
    }

    private function bucket(): string
    {
        $bucket = config('filesystems.disks.s3.bucket');
        if ($bucket === null || $bucket === '') {
            throw new \RuntimeException('AWS_BUCKET is not set.');
        }

        return (string) $bucket;
    }

    /**
     * @return array{labels: array<int, mixed>, flagged: bool}
     */
    public function detectImageModeration(string $key): array
    {
        $min = (float) config('services.rekognition.min_confidence', 60);
        $result = $this->client()->detectModerationLabels([
            'Image' => ['S3Object' => ['Bucket' => $this->bucket(), 'Name' => $key]],
            'MinConfidence' => $min,
        ]);
        $labels = $result->get('ModerationLabels') ?? [];
        $flagMin = (float) config('services.rekognition.flag_min_confidence', 75);
        $flagged = $this->labelsIndicateFlag($labels, $flagMin);

        return ['labels' => $labels, 'flagged' => $flagged];
    }

    public function startVideoModeration(string $key): string
    {
        $result = $this->client()->startContentModeration([
            'Video' => ['S3Object' => ['Bucket' => $this->bucket(), 'Name' => $key]],
            'MinConfidence' => (float) config('services.rekognition.min_confidence', 60),
        ]);
        $jobId = $result->get('JobId');
        if ($jobId === null || $jobId === '') {
            throw new \RuntimeException('Rekognition did not return JobId for video moderation.');
        }

        return (string) $jobId;
    }

    /**
     * @return array{state: string, labels: array<int, mixed>, status_message: ?string}
     */
    public function getVideoModerationAggregate(string $jobId): array
    {
        $labels = [];
        $nextToken = null;
        $lastStatus = null;
        $lastMessage = null;
        do {
            $args = [
                'JobId' => $jobId,
                'MaxResults' => 1000,
                'SortBy' => 'TIMESTAMP',
            ];
            if ($nextToken !== null) {
                $args['NextToken'] = $nextToken;
            }
            $page = $this->client()->getContentModeration($args);
            $lastStatus = $page->get('JobStatus') ?? $lastStatus;
            $lastMessage = $page->get('StatusMessage') ?? $lastMessage;
            if ($lastStatus !== 'SUCCEEDED') {
                return [
                    'state' => (string) $lastStatus,
                    'labels' => [],
                    'status_message' => $lastMessage,
                ];
            }
            foreach ($page->get('ModerationLabels') ?? [] as $row) {
                $labels[] = $row;
            }
            $nextToken = $page->get('NextToken');
        } while ($nextToken !== null);

        return [
            'state' => 'SUCCEEDED',
            'labels' => $labels,
            'status_message' => null,
        ];
    }

    /**
     * @param  array<int, mixed>  $rekognitionRows
     * @return array{labels: array<int, array<string, mixed>>, flagged: bool}
     */
    public function finalizeVideoLabels(array $rekognitionRows, float $flagMin): array
    {
        $mergedForStorage = [];
        foreach ($rekognitionRows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $m = $row['ModerationLabel'] ?? [];
            if (! is_array($m)) {
                continue;
            }
            $mergedForStorage[] = [
                'Name' => $m['Name'] ?? null,
                'ParentName' => $m['ParentName'] ?? null,
                'Confidence' => $m['Confidence'] ?? null,
                'Timestamp' => $row['Timestamp'] ?? null,
            ];
        }
        $flagged = false;
        foreach ($mergedForStorage as $label) {
            if ((float) ($label['Confidence'] ?? 0) >= $flagMin) {
                $flagged = true;
                break;
            }
        }

        return ['labels' => $mergedForStorage, 'flagged' => $flagged];
    }

    /**
     * @param  array<int, mixed>  $moderationLabels
     */
    private function labelsIndicateFlag(array $moderationLabels, float $flagMin): bool
    {
        foreach ($moderationLabels as $row) {
            if (! is_array($row)) {
                continue;
            }
            $label = $row['ModerationLabel'] ?? $row;
            if (! is_array($label)) {
                continue;
            }
            if ((float) ($label['Confidence'] ?? 0) >= $flagMin) {
                return true;
            }
        }

        return false;
    }
}
