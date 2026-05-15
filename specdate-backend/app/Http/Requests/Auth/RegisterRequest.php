<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\ApiFormRequest;

class RegisterRequest extends ApiFormRequest
{
    public function rules(): array
    {
        return [
            // Name is no longer collected on the first registration screen.
            // We default it to username in AuthService.
            'name' => 'nullable|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'email' => 'required|string|email|max:255|unique:users',
            'mobile' => 'required|string|max:20|unique:users',
            'role' => 'nullable|string|in:user',
            'dob' => 'required|date|before_or_equal:' . now()->subYears(18)->toDateString(),
            'password' => 'required|string|min:8',
            // Optional location fields (sent from mobile via expo-location reverse geocode)
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'country_code' => 'nullable|string|size:2',
            'continent' => 'nullable|string|max:255',
            // Mobile user registration is phone-first; provider web onboarding uses a separate route.
            'otp_code' => 'required|string|size:6',
            'channel' => 'required|string|in:mobile',
            'target' => 'required|string|max:255',
            'terms_accepted' => 'required|accepted',
        ];
    }

    public function messages(): array
    {
        return [
            'dob.required' => 'Date of birth is required.',
            'dob.before_or_equal' => 'You must be 18 or older to use DateUsher.',
            'otp_code.required' => 'Phone verification code is required.',
            'channel.in' => 'Mobile phone verification is required for registration.',
        ];
    }
}
