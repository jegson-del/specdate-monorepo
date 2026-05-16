<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExtendSpecSearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'comment' => 'nullable|string',
            'duration' => 'sometimes|integer|min:1|max:30',
        ];
    }

    public function comment(): ?string
    {
        return $this->input('comment');
    }

    public function durationDays(): int
    {
        return (int) $this->input('duration', 30);
    }
}
