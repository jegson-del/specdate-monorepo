<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\Spec;
use App\Models\SpecApplication;
use App\Models\SpecRound;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoundAnswerSubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_participant_can_submit_round_answer_with_media_only(): void
    {
        [$participant, $round] = $this->createActiveRoundForParticipant();
        $media = Media::create([
            'user_id' => $participant->id,
            'file_path' => 'uploads/answers/photo.jpg',
            'url' => 'https://example.com/photo.jpg',
            'type' => 'round_answer_image',
            'mime_type' => 'image/jpeg',
            'size' => 1234,
            'moderation_status' => 'approved',
        ]);

        Sanctum::actingAs($participant);

        $this->postJson("/api/rounds/{$round->id}/answer", [
            'media_id' => $media->id,
        ])->assertOk()
            ->assertJsonPath('data.media_id', $media->id)
            ->assertJsonPath('data.answer_text', '');

        $this->assertDatabaseHas('spec_round_answers', [
            'spec_round_id' => $round->id,
            'user_id' => $participant->id,
            'answer_text' => '',
            'media_id' => $media->id,
        ]);
    }

    public function test_participant_cannot_submit_round_answer_with_unapproved_media(): void
    {
        [$participant, $round] = $this->createActiveRoundForParticipant();
        $media = Media::create([
            'user_id' => $participant->id,
            'file_path' => 'uploads/answers/pending.jpg',
            'url' => 'https://example.com/pending.jpg',
            'type' => 'round_answer_image',
            'mime_type' => 'image/jpeg',
            'size' => 1234,
            'moderation_status' => 'pending',
        ]);

        Sanctum::actingAs($participant);

        $this->postJson("/api/rounds/{$round->id}/answer", [
            'media_id' => $media->id,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'This file could not be sent. Please choose a different file.');

        $this->assertDatabaseMissing('spec_round_answers', [
            'spec_round_id' => $round->id,
            'user_id' => $participant->id,
            'media_id' => $media->id,
        ]);
    }

    public function test_owner_cannot_start_round_with_unapproved_question_media(): void
    {
        $owner = User::factory()->create();
        $participant = User::factory()->create();
        $spec = Spec::create([
            'user_id' => $owner->id,
            'title' => 'Round question quest',
            'description' => 'Ask with media',
            'expires_at' => now()->addDays(3),
            'max_participants' => 2,
            'status' => 'OPEN',
        ]);
        SpecApplication::create([
            'spec_id' => $spec->id,
            'user_id' => $participant->id,
            'user_role' => 'participant',
            'status' => 'ACCEPTED',
        ]);
        $media = Media::create([
            'user_id' => $owner->id,
            'file_path' => 'uploads/questions/flagged.jpg',
            'url' => 'https://example.com/flagged.jpg',
            'type' => 'round_question_image',
            'mime_type' => 'image/jpeg',
            'size' => 1234,
            'moderation_status' => 'flagged',
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/specs/{$spec->id}/rounds", [
            'question' => 'What would you plan?',
            'media_id' => $media->id,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'This file could not be sent. Please choose a different file.');

        $this->assertDatabaseMissing('spec_rounds', [
            'spec_id' => $spec->id,
            'media_id' => $media->id,
        ]);
    }

    public function test_starting_first_round_closes_applications_and_locks_current_capacity(): void
    {
        $owner = User::factory()->create();
        $participants = User::factory()->count(2)->create();
        $spec = Spec::create([
            'user_id' => $owner->id,
            'title' => 'Early round quest',
            'description' => 'Starts before full capacity',
            'expires_at' => now()->addDays(10),
            'max_participants' => 10,
            'status' => 'OPEN',
        ]);
        foreach ($participants as $participant) {
            SpecApplication::create([
                'spec_id' => $spec->id,
                'user_id' => $participant->id,
                'user_role' => 'participant',
                'status' => 'ACCEPTED',
            ]);
        }

        Sanctum::actingAs($owner);

        $this->postJson("/api/specs/{$spec->id}/rounds", [
            'question' => 'Ready?',
        ])->assertOk();

        $spec->refresh();
        $this->assertSame('ACTIVE', $spec->status);
        $this->assertSame(2, $spec->max_participants);
        $this->assertTrue($spec->expires_at->between(now()->subMinute(), now()->addMinute()));
    }

    public function test_owner_cannot_start_next_round_without_eliminating_someone(): void
    {
        [$owner, $spec] = $this->createActiveSpecWithParticipants(2);
        SpecRound::create([
            'spec_id' => $spec->id,
            'round_number' => 1,
            'question_text' => 'First question',
            'status' => 'COMPLETED',
        ]);

        Sanctum::actingAs($owner);

        $this->postJson("/api/specs/{$spec->id}/rounds", [
            'question' => 'Next question',
        ])->assertStatus(400)
            ->assertJsonPath('message', 'Eliminate at least one participant before starting the next round. If participants have not answered, nudge them from the close round prompt.');
    }

    public function test_owner_can_start_next_round_after_elimination(): void
    {
        [$owner, $spec, $participants] = $this->createActiveSpecWithParticipants(2);
        $round = SpecRound::create([
            'spec_id' => $spec->id,
            'round_number' => 1,
            'question_text' => 'First question',
            'status' => 'COMPLETED',
        ]);
        $round->answers()->create([
            'user_id' => $participants[0]->id,
            'answer_text' => 'Answer',
            'is_eliminated' => true,
        ]);
        SpecApplication::where('spec_id', $spec->id)
            ->where('user_id', $participants[0]->id)
            ->update(['status' => 'ELIMINATED']);

        Sanctum::actingAs($owner);

        $this->postJson("/api/specs/{$spec->id}/rounds", [
            'question' => 'Next question',
        ])->assertOk()
            ->assertJsonPath('data.round_number', 2);
    }

    public function test_participant_cannot_submit_empty_round_answer(): void
    {
        [$participant, $round] = $this->createActiveRoundForParticipant();

        Sanctum::actingAs($participant);

        $this->postJson("/api/rounds/{$round->id}/answer", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('answer');
    }

    private function createActiveRoundForParticipant(): array
    {
        $owner = User::factory()->create();
        $participant = User::factory()->create();
        $spec = Spec::create([
            'user_id' => $owner->id,
            'title' => 'Round answer quest',
            'description' => 'Answer with media',
            'expires_at' => now()->addDays(3),
            'max_participants' => 2,
            'status' => 'ACTIVE',
        ]);
        SpecApplication::create([
            'spec_id' => $spec->id,
            'user_id' => $participant->id,
            'user_role' => 'participant',
            'status' => 'ACCEPTED',
        ]);
        $round = SpecRound::create([
            'spec_id' => $spec->id,
            'round_number' => 1,
            'question_text' => 'Send your best moment.',
            'status' => 'ACTIVE',
        ]);

        return [$participant, $round];
    }

    private function createActiveSpecWithParticipants(int $count): array
    {
        $owner = User::factory()->create();
        $participants = User::factory()->count($count)->create();
        $spec = Spec::create([
            'user_id' => $owner->id,
            'title' => 'Active quest',
            'description' => 'Has participants',
            'expires_at' => now(),
            'max_participants' => $count,
            'status' => 'ACTIVE',
        ]);

        foreach ($participants as $participant) {
            SpecApplication::create([
                'spec_id' => $spec->id,
                'user_id' => $participant->id,
                'user_role' => 'participant',
                'status' => 'ACCEPTED',
            ]);
        }

        return [$owner, $spec, $participants];
    }
}
