<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSpecRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization is handled in Service/Controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'location_city' => 'sometimes|nullable|string',
            'location_lat' => 'sometimes|nullable|numeric',
            'location_lng' => 'sometimes|nullable|numeric',
            'duration' => 'sometimes|integer|min:1',
            'max_participants' => 'sometimes|integer|min:1',
            'status' => 'sometimes|in:LIVE,CLOSED,REVIEWING',
            'requirements' => 'sometimes|array',
            'requirements.*.field' => 'required_with:requirements|string',
            'requirements.*.value' => 'required_with:requirements', 
            'requirements.*.operator' => 'sometimes|string|in:=,!=,>,>=,<,<=,in,not_in',
            'requirements.*.is_compulsory' => 'sometimes|boolean',
        ];
    }
}
