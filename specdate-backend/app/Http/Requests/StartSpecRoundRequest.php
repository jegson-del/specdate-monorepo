<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartSpecRoundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'question' => 'nullable|string|required_without:media_id',
            'media_id' => 'nullable|exists:media,id',
        ];
    }

    public function question(): string
    {
        return (string) ($this->input('question') ?? '');
    }

    public function mediaId()
    {
        return $this->input('media_id');
    }
}
