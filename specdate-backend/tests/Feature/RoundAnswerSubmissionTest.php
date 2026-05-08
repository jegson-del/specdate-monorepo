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
}
