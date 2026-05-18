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
        if ($media->hidden_at !== null) {
            return false;
        }

        if ($media->moderation_status === 'approved') {
            return true;
        }

        return $media->moderation_status === 'manual_pending'
            && $this->isAudio($media);
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

    private function isAudio(Media $media): bool
    {
        return $media->type === 'chat_audio'
            || str_starts_with((string) $media->mime_type, 'audio/');
    }
}
