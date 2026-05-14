<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SpecRoundUserListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ];
    }

    public function userIds(): array
    {
        return $this->input('user_ids', []);
    }
}
