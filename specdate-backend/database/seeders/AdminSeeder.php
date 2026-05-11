<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@dateusher.test'],
            [
                'name' => 'DateUsher Admin',
                'username' => 'dateusher-admin',
                'mobile' => '+10000000000',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'terms_accepted' => true,
            ]
        );
    }
}
