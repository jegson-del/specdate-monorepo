<?php

namespace App\Services;

use App\Models\Spec;
use App\Models\SpecDate;
use App\Models\ChatThread;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

class SpecDateService
{
    public function __construct(
        private ChatService $chatService,
        private SpecParticipantService $participants,
        private UserCreditService $credits,
        private NotificationService $notificationService,
    ) {
    }

    public function createDate($user, $specId): array
    {
        $spec = Spec::findOrFail($specId);
        if ($spec->user_id !== $user->id) {
            throw new HttpException(403, 'You are not the owner of this spec.');
        }

        $winnerApp = $this->participants->activeParticipantApplications($spec)->with('user')->first();
        if (!$winnerApp || $this->participants->activeParticipantCount($spec) !== 1) {
            throw new HttpException(400, 'There must be exactly one active participant (last man standing) to create a date.');
        }

        if ($spec->dates()->exists()) {
            throw new HttpException(400, 'A date has already been created for this spec.');
        }

        $dateCode = $this->generateDateCode();

        $date = null;
        $thread = null;

        DB::transaction(function () use ($spec, $winnerApp, $dateCode, &$date, &$thread) {
            $date = $spec->dates()->create([
                'owner_id' => $spec->user_id,
                'winner_user_id' => $winnerApp->user_id,
                'scheduled_by_user_id' => $spec->user_id,
                'date_code' => $dateCode,
                'date_number' => 1,
                'status' => SpecDate::STATUS_ACTIVE,
            ]);
            $thread = $this->chatService->ensureThreadForDate($date);
            $winnerApp->update(['status' => 'WINNER']);
            $spec->rounds()
                ->whereIn('status', ['ACTIVE', 'REVIEWING'])
                ->update(['status' => 'COMPLETED']);
            $spec->update(['status' => 'COMPLETED']);
        });

        if ($date) {
            $date->loadMissing(['spec:id,title', 'owner.profile', 'winner.profile']);
            $this->notifyMatchCreated($date, $thread?->id);
        }

        return [
            'message' => 'Date created successfully.',
            'date_code' => $dateCode,
            'winner_user_id' => $winnerApp->user_id,
            'spec_status' => 'COMPLETED',
        ];
    }

    public function scheduleFollowUpDate(User $user, int $dateId): array
    {
        $selectedDate = SpecDate::with(['spec', 'owner', 'winner'])->findOrFail($dateId);
        if ((int) $selectedDate->owner_id !== (int) $user->id && (int) $selectedDate->winner_user_id !== (int) $user->id) {
            throw new HttpException(403, 'You cannot schedule another date for this match.');
        }

        $rootId = $selectedDate->root_spec_date_id ?: $selectedDate->id;
        $dateCode = $this->generateDateCode();

        $newDate = DB::transaction(function () use ($user, $rootId, $dateCode) {
            $latestDate = SpecDate::query()
                ->where(function ($q) use ($rootId) {
                    $q->where('id', $rootId)->orWhere('root_spec_date_id', $rootId);
                })
                ->orderByDesc('date_number')
                ->lockForUpdate()
                ->firstOrFail();

            if (!in_array($latestDate->status, [SpecDate::STATUS_COMPLETED, SpecDate::STATUS_CANCELLED], true)) {
                throw new HttpException(422, 'You can schedule another date after the current date is completed or cancelled.');
            }

            $balance = $this->credits->debitCredit(
                $user,
                'Scheduled another date',
                [
                    'spec_id' => $latestDate->spec_id,
                    'root_spec_date_id' => $rootId,
                    'previous_spec_date_id' => $latestDate->id,
                    'action' => 'schedule_follow_up_date',
                ],
                'Insufficient credits.',
                402
            );

            $date = SpecDate::create([
                'root_spec_date_id' => $rootId,
                'parent_spec_date_id' => $latestDate->id,
                'spec_id' => $latestDate->spec_id,
                'owner_id' => $latestDate->owner_id,
                'winner_user_id' => $latestDate->winner_user_id,
                'scheduled_by_user_id' => $user->id,
                'date_code' => $dateCode,
                'date_number' => ((int) $latestDate->date_number) + 1,
                'status' => SpecDate::STATUS_ACTIVE,
            ]);

            $this->chatService->ensureThreadForDate($date);

            $date->balance_after = $balance->credits;
            return $date;
        });

        $newDate->load([
            'spec:id,title,description,location_city,status,created_at',
            'owner:id,name,username',
            'owner.profile',
            'owner.media',
            'winner:id,name,username',
            'winner.profile',
            'winner.media',
        ]);

        return [
            'message' => $this->dateOrdinal((int) $newDate->date_number) . ' date scheduled.',
            'date' => $this->datePayloadForUser($newDate, $user),
            'balance' => ['credits' => $newDate->balance_after],
        ];
    }

    public function listDatesForUser($user, int $perPage = 20)
    {
        $dates = SpecDate::query()
            ->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                    ->orWhere('winner_user_id', $user->id);
            })
            ->whereNotExists(function ($q) {
                $q->selectRaw('1')
                    ->from('spec_dates as newer_dates')
                    ->whereRaw('COALESCE(newer_dates.root_spec_date_id, newer_dates.id) = COALESCE(spec_dates.root_spec_date_id, spec_dates.id)')
                    ->whereColumn('newer_dates.date_number', '>', 'spec_dates.date_number');
            })
            ->with([
                'spec:id,title,description,location_city,status,created_at',
                'owner:id,name,username',
                'owner.profile',
                'owner.media',
                'winner:id,name,username',
                'winner.profile',
                'winner.media',
            ])
            ->latest()
            ->paginate(max(1, min($perPage, 50)));

        $dates->getCollection()->transform(fn (SpecDate $date) => $this->datePayloadForUser($date, $user));

        return $dates;
    }

    private function datePayloadForUser(SpecDate $date, User $user): array
    {
        $owner = $date->owner;
        $winner = $date->winner;
        $isOwner = (int) $date->owner_id === (int) $user->id;
        $otherUser = $isOwner ? $winner : $owner;
        $chatThread = $this->existingThreadForDate($date);
        $winnerAvatar = $winner?->media?->where('type', 'avatar')->filter(fn ($media) => $media->isShareable())->sortByDesc('id')->first()?->url;
        $ownerAvatar = $owner?->media?->where('type', 'avatar')->filter(fn ($media) => $media->isShareable())->sortByDesc('id')->first()?->url;
        $otherAvatar = $otherUser?->media?->where('type', 'avatar')->filter(fn ($media) => $media->isShareable())->sortByDesc('id')->first()?->url;
        $dateNumber = (int) ($date->date_number ?: 1);

        return [
            'id' => $date->id,
            'root_spec_date_id' => $date->root_spec_date_id,
            'parent_spec_date_id' => $date->parent_spec_date_id,
            'spec_id' => $date->spec_id,
            'owner_id' => $date->owner_id,
            'winner_user_id' => $date->winner_user_id,
            'scheduled_by_user_id' => $date->scheduled_by_user_id,
            'date_code' => $date->date_code,
            'date_number' => $dateNumber,
            'date_label' => $this->dateOrdinal($dateNumber) . ' date',
            'status' => $date->status ?: SpecDate::STATUS_ACTIVE,
            'can_schedule_another' => in_array($date->status, [SpecDate::STATUS_COMPLETED, SpecDate::STATUS_CANCELLED], true),
            'chat_thread_id' => $chatThread?->id,
            'matched_at' => $date->created_at,
            'is_owner' => $isOwner,
            'spec' => $date->spec,
            'owner' => $owner ? [
                'id' => $owner->id,
                'name' => $owner->profile?->full_name ?? $owner->name,
                'username' => $owner->username,
                'avatar' => $ownerAvatar,
            ] : null,
            'winner' => $winner ? [
                'id' => $winner->id,
                'name' => $winner->profile?->full_name ?? $winner->name,
                'username' => $winner->username,
                'avatar' => $winnerAvatar,
            ] : null,
            'other_user' => $otherUser ? [
                'id' => $otherUser->id,
                'name' => $otherUser->profile?->full_name ?? $otherUser->name,
                'username' => $otherUser->username,
                'avatar' => $otherAvatar,
            ] : null,
        ];
    }

    private function existingThreadForDate(SpecDate $date): ?ChatThread
    {
        return ChatThread::query()
            ->where('type', 'match')
            ->where('spec_date_id', $date->id)
            ->first()
            ?? ChatThread::query()
                ->where('type', 'match')
                ->where('spec_id', $date->spec_id)
                ->where('owner_id', $date->owner_id)
                ->where('winner_user_id', $date->winner_user_id)
                ->latest('id')
                ->first();
    }

    private function dateOrdinal(int $number): string
    {
        if ($number === 1) return 'First';
        if ($number === 2) return 'Second';
        if ($number === 3) return 'Third';
        return "{$number}th";
    }

    private function generateDateCode(): string
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        do {
            $code = '';
            for ($i = 0; $i < 6; $i++) {
                $code .= $chars[random_int(0, strlen($chars) - 1)];
            }
        } while (SpecDate::where('date_code', $code)->exists());

        return $code;
    }

    private function notifyMatchCreated(SpecDate $date, ?int $threadId): void
    {
        $owner = $date->owner;
        $winner = $date->winner;
        if (!$owner || !$winner) {
            return;
        }

        $specTitle = $date->spec?->title ?? 'your spec';
        $ownerName = $owner->profile?->full_name ?? $owner->name ?? 'Your host';
        $winnerName = $winner->profile?->full_name ?? $winner->name ?? 'Your match';
        $payload = [
            'spec_id' => $date->spec_id,
            'spec_date_id' => $date->id,
            'date_code' => $date->date_code,
            'thread_id' => $threadId,
        ];

        $this->notificationService->notify(
            $winner,
            'match_created',
            array_merge($payload, [
                'matched_user_id' => $owner->id,
                'matched_user_name' => $ownerName,
            ]),
            "It's a match!",
            "{$ownerName} matched with you on {$specTitle}. Your date code is {$date->date_code}."
        );

        $this->notificationService->notify(
            $owner,
            'match_created',
            array_merge($payload, [
                'matched_user_id' => $winner->id,
                'matched_user_name' => $winnerName,
            ]),
            'Date match created',
            "You matched with {$winnerName}. Your date code is {$date->date_code}."
        );
    }

}
