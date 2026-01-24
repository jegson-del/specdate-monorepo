<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthService
{
    protected $balloonService;

    public function __construct(BalloonService $balloonService)
    {
        $this->balloonService = $balloonService;
    }

    /**
     * Handle user registration.
     *
     * @param array $data
     * @return array
     */
    public function register(array $data): array
    {
        // 1. Create User
        $user = User::create([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'],
            'mobile' => $data['mobile'],
            'password' => Hash::make($data['password']),
        ]);

        // 2. Create Profile with Location (if provided)
        $user->profile()->create([
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'city' => $data['city'] ?? null,
            'state' => $data['state'] ?? null,
            'country' => $data['country'] ?? null,
            'continent' => $data['continent'] ?? null,
            // Other compulsory fields will be filled in the Profile steps
            // We initialize them as empty/null here or handle them in a separate update
            // ideally we'd validate them here if sent, but simpler to just init location.
        ]);

        // 3. Initialize Balloons
        $this->balloonService->initializeForUser($user);

        // 3. Create Token
        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token
        ];
    }

    /**
     * Handle user login.
     *
     * @param array $credentials
     * @return array|null Returns null on failure
     */
    public function login(array $credentials): ?array
    {
        if (!Auth::attempt($credentials)) {
            return null;
        }

        $user = User::where('email', $credentials['email'])->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user' => $user,
            'token' => $token
        ];
    }
}
