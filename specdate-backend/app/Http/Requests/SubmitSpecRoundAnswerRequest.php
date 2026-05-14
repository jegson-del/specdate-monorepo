<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitSpecRoundAnswerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'answer' => 'nullable|string|required_without:media_id',
            'media_id' => 'nullable|exists:media,id',
        ];
    }

    public function answerText(): string
    {
        return (string) ($this->input('answer') ?? '');
    }

    public function mediaId()
    {
        return $this->input('media_id');
    }
}
