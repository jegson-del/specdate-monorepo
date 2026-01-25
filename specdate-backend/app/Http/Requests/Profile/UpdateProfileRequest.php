<?php

namespace App\Http\Requests\Profile;

use App\Http\Requests\ApiFormRequest;

class UpdateProfileRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'dob' => 'nullable|date',
            'full_name' => 'nullable|string|max:255',
            'sex' => 'nullable|string|max:50',
            'occupation' => 'nullable|string|max:255',
            'qualification' => 'nullable|string|max:255',
            'hobbies' => 'nullable|string',
            'is_smoker' => 'nullable|boolean',
            'is_drug_user' => 'nullable|boolean',
            'sexual_orientation' => 'nullable|string|max:50',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
        ];
    }
}

