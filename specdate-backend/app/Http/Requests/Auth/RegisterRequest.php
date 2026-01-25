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
            'password' => 'required|string|min:8',
            // Optional location fields (sent from mobile via expo-location reverse geocode)
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:255',
            'continent' => 'nullable|string|max:255',
        ];
    }
}

