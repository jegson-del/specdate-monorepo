<?php

namespace Tests\Feature;

use App\Models\Spec;
use App\Models\SpecApplication;
use App\Models\SpecDate;
use App\Models\SpecRound;
use App\Models\SpecRoundAnswer;
use App\Models\ChatThread;
use App\Models\Notification;
use App\Models\User;
use App\Models\UserBalance;
use App\Events\NotificationCreated;
use App\Services\SpecService;
use Illuminate\Support\Facades\Event;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class SpecLastManStandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_date_for_last_man_standing_and_chat_thread_is_created(): void
    {
        [$owner, $winner, $spec, $round] = $this->createLastManStandingSpec();
        Event::fake([NotificationCreated::class]);

        $result = app(SpecService::class)->createDate($owner, $spec->id);

        $this->assertSame($winner->id, $result['winner_user_id']);
        $this->assertNotEmpty($result['date_code']);

        $this->assertDatabaseHas('spec_dates', [
            'spec_id' => $spec->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
        ]);
        $date = SpecDate::where('spec_id', $spec->id)->firstOrFail();
        $thread = ChatThread::where('spec_id', $spec->id)->firstOrFail();
        $this->assertDatabaseHas('chat_threads', [
            'spec_id' => $spec->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $winner->id,
            'type' => 'match_created',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $owner->id,
            'type' => 'match_created',
        ]);
        $winnerNotification = Notification::where('user_id', $winner->id)
            ->where('type', 'match_created')
            ->firstOrFail();
        $this->assertSame($spec->id, $winnerNotification->data['spec_id']);
        $this->assertSame($date->id, $winnerNotification->data['spec_date_id']);
        $this->assertSame($thread->id, $winnerNotification->data['thread_id']);
        $this->assertSame($result['date_code'], $winnerNotification->data['date_code']);
        Event::assertDispatched(NotificationCreated::class, 2);
        $this->assertDatabaseHas('spec_applications', [
            'spec_id' => $spec->id,
            'user_id' => $winner->id,
            'status' => 'WINNER',
        ]);
        $this->assertSame('COMPLETED', $spec->fresh()->status);
        $this->assertSame('COMPLETED', $round->fresh()->status);
    }

    public function test_extend_search_charges_one_credit_and_reopens_spec(): void
    {
        [$owner, $winner, $spec, $round] = $this->createLastManStandingSpec();
        UserBalance::create(['user_id' => $owner->id, 'credits' => 2]);

        $result = app(SpecService::class)->extendSearch($owner, $spec->id, 'I need more time.', 30);

        $this->assertSame(1, $result['balance']['credits']);
        $this->assertDatabaseHas('user_balances', [
            'user_id' => $owner->id,
            'credits' => 1,
        ]);
        $this->assertDatabaseHas('spec_applications', [
            'spec_id' => $spec->id,
            'user_id' => $winner->id,
            'status' => 'ELIMINATED',
        ]);
        $this->assertDatabaseHas('spec_round_answers', [
            'spec_round_id' => $round->id,
            'user_id' => $winner->id,
            'is_eliminated' => true,
        ]);
        $spec->refresh();
        $this->assertSame('OPEN', $spec->status);
        $this->assertTrue($spec->expires_at->between(now()->addDays(29)->subMinute(), now()->addDays(30)->addMinute()));
    }

    public function test_extend_search_is_blocked_when_owner_has_no_credits(): void
    {
        [$owner, , $spec] = $this->createLastManStandingSpec();
        UserBalance::create(['user_id' => $owner->id, 'credits' => 0]);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Insufficient credits. Please purchase more.');

        app(SpecService::class)->extendSearch($owner, $spec->id);
    }

    public function test_user_can_schedule_follow_up_after_completed_date(): void
    {
        [$owner, $winner, $spec] = $this->createLastManStandingSpec();
        UserBalance::create(['user_id' => $winner->id, 'credits' => 3]);
        app(SpecService::class)->createDate($owner, $spec->id);
        $firstDate = SpecDate::where('spec_id', $spec->id)->firstOrFail();
        $firstThreadId = ChatThread::where('spec_id', $spec->id)->value('id');
        $firstDate->update(['status' => SpecDate::STATUS_COMPLETED]);

        $result = app(SpecService::class)->scheduleFollowUpDate($winner, $firstDate->id);

        $this->assertSame(2, $result['balance']['credits']);
        $this->assertSame(2, $result['date']['date_number']);
        $this->assertSame('Second date', $result['date']['date_label']);
        $this->assertSame($firstThreadId, $result['date']['chat_thread_id']);
        $this->assertNotSame($firstDate->date_code, $result['date']['date_code']);
        $this->assertDatabaseHas('spec_dates', [
            'root_spec_date_id' => $firstDate->id,
            'parent_spec_date_id' => $firstDate->id,
            'date_number' => 2,
            'scheduled_by_user_id' => $winner->id,
            'status' => SpecDate::STATUS_ACTIVE,
        ]);
        $this->assertSame(1, ChatThread::where('spec_id', $spec->id)->count());
        $this->assertDatabaseHas('chat_threads', [
            'id' => $firstThreadId,
            'spec_date_id' => $result['date']['id'],
        ]);

        SpecDate::findOrFail($result['date']['id'])->update(['status' => SpecDate::STATUS_COMPLETED]);

        $thirdResult = app(SpecService::class)->scheduleFollowUpDate($winner, $result['date']['id']);

        $this->assertSame(1, $thirdResult['balance']['credits']);
        $this->assertSame(3, $thirdResult['date']['date_number']);
        $this->assertSame($firstThreadId, $thirdResult['date']['chat_thread_id']);
        $this->assertSame(1, ChatThread::where('spec_id', $spec->id)->count());
    }

    public function test_follow_up_is_blocked_while_latest_date_is_active(): void
    {
        [$owner, , $spec] = $this->createLastManStandingSpec();
        UserBalance::create(['user_id' => $owner->id, 'credits' => 2]);
        app(SpecService::class)->createDate($owner, $spec->id);
        $firstDate = SpecDate::where('spec_id', $spec->id)->firstOrFail();

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('You can schedule another date after the current date is completed or cancelled.');

        app(SpecService::class)->scheduleFollowUpDate($owner, $firstDate->id);
    }

    public function test_listing_dates_uses_existing_chat_thread_without_mutating_duplicates(): void
    {
        $owner = User::factory()->create();
        $winner = User::factory()->create();
        $spec = Spec::create([
            'user_id' => $owner->id,
            'title' => 'Follow up quest',
            'description' => 'Find one date',
            'expires_at' => now()->addDays(3),
            'max_participants' => 2,
            'status' => 'COMPLETED',
        ]);
        $firstDate = SpecDate::create([
            'spec_id' => $spec->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
            'scheduled_by_user_id' => $owner->id,
            'date_code' => 'ABC123',
            'date_number' => 1,
            'status' => SpecDate::STATUS_COMPLETED,
        ]);
        $secondDate = SpecDate::create([
            'root_spec_date_id' => $firstDate->id,
            'parent_spec_date_id' => $firstDate->id,
            'spec_id' => $spec->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
            'scheduled_by_user_id' => $winner->id,
            'date_code' => 'DEF456',
            'date_number' => 2,
            'status' => SpecDate::STATUS_COMPLETED,
        ]);
        $firstThread = ChatThread::create([
            'spec_date_id' => $firstDate->id,
            'type' => 'match',
            'spec_id' => $spec->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
        ]);
        $secondThread = ChatThread::create([
            'spec_date_id' => $secondDate->id,
            'type' => 'match',
            'spec_id' => $spec->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
        ]);

        $dates = app(SpecService::class)->listDatesForUser($owner, 20);
        $payload = collect($dates->items())->firstWhere('id', $secondDate->id);

        $this->assertNotNull($payload);
        $this->assertSame($secondThread->id, $payload['chat_thread_id']);
        $this->assertDatabaseHas('chat_threads', [
            'id' => $firstThread->id,
            'spec_date_id' => $firstDate->id,
        ]);
    }

    private function createLastManStandingSpec(): array
    {
        $owner = User::factory()->create();
        $winner = User::factory()->create();
        $spec = Spec::create([
            'user_id' => $owner->id,
            'title' => 'Last man quest',
            'description' => 'Find one date',
            'expires_at' => now()->addDays(3),
            'max_participants' => 3,
            'status' => 'REVIEWING',
        ]);
        SpecApplication::create([
            'spec_id' => $spec->id,
            'user_id' => $winner->id,
            'user_role' => 'participant',
            'status' => 'ACCEPTED',
        ]);
        $round = SpecRound::create([
            'spec_id' => $spec->id,
            'round_number' => 1,
            'question_text' => 'Why should you win?',
            'status' => 'REVIEWING',
        ]);
        SpecRoundAnswer::create([
            'spec_round_id' => $round->id,
            'user_id' => $winner->id,
            'answer_text' => 'Because I care.',
            'is_eliminated' => false,
        ]);

        return [$owner, $winner, $spec, $round];
    }
}
