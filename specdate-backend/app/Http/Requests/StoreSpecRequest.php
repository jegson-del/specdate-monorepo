<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSpecRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'location_city' => 'nullable|string',
            'location_lat' => 'nullable|numeric',
            'location_lng' => 'nullable|numeric',
            'duration' => 'required|integer|min:1|max:14',
            'max_participants' => 'required|integer|min:1',
            'requirements' => 'array',
            'requirements.*.field' => 'required|string',
            'requirements.*.operator' => 'required|string|in:>=,<=,=,in',
            'requirements.*.value' => 'required',
            'requirements.*.is_compulsory' => 'boolean',
        ];
    }
}
