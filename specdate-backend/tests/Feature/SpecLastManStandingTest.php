<?php

namespace Tests\Feature;

use App\Models\Spec;
use App\Models\SpecApplication;
use App\Models\SpecRound;
use App\Models\SpecRoundAnswer;
use App\Models\User;
use App\Models\UserBalance;
use App\Services\SpecService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class SpecLastManStandingTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_date_for_last_man_standing_and_chat_thread_is_created(): void
    {
        [$owner, $winner, $spec, $round] = $this->createLastManStandingSpec();

        $result = app(SpecService::class)->createDate($owner, $spec->id);

        $this->assertSame($winner->id, $result['winner_user_id']);
        $this->assertNotEmpty($result['date_code']);

        $this->assertDatabaseHas('spec_dates', [
            'spec_id' => $spec->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
        ]);
        $this->assertDatabaseHas('chat_threads', [
            'spec_id' => $spec->id,
            'owner_id' => $owner->id,
            'winner_user_id' => $winner->id,
        ]);
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

        $result = app(SpecService::class)->extendSearch($owner, $spec->id, 'I need more time.');

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
        $this->assertSame('OPEN', $spec->fresh()->status);
    }

    public function test_extend_search_is_blocked_when_owner_has_no_credits(): void
    {
        [$owner, , $spec] = $this->createLastManStandingSpec();
        UserBalance::create(['user_id' => $owner->id, 'credits' => 0]);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Insufficient credits. Please purchase more.');

        app(SpecService::class)->extendSearch($owner, $spec->id);
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
