<?php

namespace App\Services;

use App\Models\ModerationAppeal;
use App\Models\User;

class ModerationNotificationService
{
    public const TYPE_APPEAL_RECEIVED = 'moderation_appeal_received';
    public const TYPE_APPEAL_GRANTED = 'moderation_appeal_granted';
    public const TYPE_APPEAL_DENIED = 'moderation_appeal_denied';

    public function __construct(private NotificationService $notifications)
    {
    }

    public function notifyAppealReceived(ModerationAppeal $appeal): void
    {
        $appeal->loadMissing(['user', 'action']);

        User::query()
            ->where('role', 'admin')
            ->get()
            ->each(fn (User $admin) => $this->notifications->notify(
                $admin,
                self::TYPE_APPEAL_RECEIVED,
                array_merge($this->appealData($appeal), [
                    'admin_url' => $this->adminAppealUrl($appeal),
                ]),
                'Moderation appeal received',
                ($appeal->user?->name ?: 'A user').' submitted a moderation appeal.'
            ));
    }

    public function notifyAppealDecision(ModerationAppeal $appeal): void
    {
        $appeal->loadMissing(['user', 'action']);
        if (! $appeal->user) {
            return;
        }

        $granted = $appeal->status === ModerationAppeal::STATUS_GRANTED;
        $this->notifications->notify(
            $appeal->user,
            $granted ? self::TYPE_APPEAL_GRANTED : self::TYPE_APPEAL_DENIED,
            $this->appealData($appeal),
            $granted ? 'Appeal approved' : 'Appeal reviewed',
            $granted
                ? 'Your moderation appeal was approved. Your account status has been updated.'
                : 'Your moderation appeal was reviewed and the original decision remains in place.'
        );
    }

    private function appealData(ModerationAppeal $appeal): array
    {
        return [
            'appeal_id' => $appeal->id,
            'case_id' => $appeal->case_id,
            'action_id' => $appeal->action_id,
            'status' => $appeal->status,
            'moderation_action' => $appeal->action?->action,
        ];
    }

    private function adminAppealUrl(ModerationAppeal $appeal): string
    {
        return rtrim((string) config('app.frontend_url', config('app.url')), '/')
            . '/admin/moderation/appeals?'
            . http_build_query([
                'status' => ModerationAppeal::STATUS_OPEN,
                'appeal_id' => $appeal->id,
            ]);
    }
}
