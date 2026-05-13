<?php

namespace App\Services;

use App\Models\Media;

class MediaAttachmentPolicyService
{
    /**
     * Image/video must pass automated moderation before sharing. Audio is allowed
     * while manually pending, matching the current rollout decision.
     */
    public function canAttach(Media $media): bool
    {
        return $media->isShareable();
    }

    /**
     * @return list<string>
     */
    public function allowedStatuses(): array
    {
        return Media::SHAREABLE_MODERATION_STATUSES;
    }

    public function blockedMessage(): string
    {
        return 'This file could not be sent. Please choose a different file.';
    }
}
