<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Spec;
use App\Models\User;
use App\Models\SpecApplication;
use Carbon\Carbon;

class FilterTestSeeder extends Seeder
{
    public function run()
    {
        $user = User::first(); 
        if (!$user) {
            $user = User::factory()->create([
                'username' => 'testuser',
                'mobile' => '08012345678',
            ]);
        }

        // 1. ONGOING: Expires tomorrow (less than 48h)
        Spec::create([
            'user_id' => $user->id,
            'title' => 'Ongoing Spec (Ends Soon)',
            'description' => 'This spec ends in 24 hours, should appear in ONGOING.',
            'location_city' => 'Lagos',

            'max_participants' => 10,
            'status' => 'OPEN',
            'expires_at' => Carbon::now()->addHours(20),
            'created_at' => Carbon::now()->subDays(5),
            'updated_at' => Carbon::now(),
        ]);

        Spec::create([
            'user_id' => $user->id,
            'title' => 'Urgent Spec',
            'description' => 'This spec ends in 5 hours!',
            'location_city' => 'Abuja',

            'max_participants' => 5,
            'status' => 'OPEN',
            'expires_at' => Carbon::now()->addHours(5),
            'created_at' => Carbon::now()->subDays(2),
            'updated_at' => Carbon::now(),
        ]);

        // 2. POPULAR: High Application Count
        // We'll create a spec and attach many applications
        $popular = Spec::create([
            'user_id' => $user->id,
            'title' => 'Very Popular Spec',
            'description' => 'This spec has many applicants.',
            'location_city' => 'London',

            'max_participants' => 50,
            'status' => 'OPEN',
            'expires_at' => Carbon::now()->addDays(5),
            'created_at' => Carbon::now()->subDays(1),
            'updated_at' => Carbon::now(),
        ]);

        // Add 15 dummy applications
        for ($i = 0; $i < 15; $i++) {
            // Create dummy user for application if needed, or just raw DB insert to be fast
            // Using DB insert to avoid User factory overhead if not needed, but safer to use factory if we have it
             // Let's just assume we can reuse same user or create lightweight
             // Actually, we need unique users for applications typically? 
             // Logic doesn't strictly enforce unique user per app in schema unless unique key exists.
             // Schema likely has unique(spec_id, user_id).
             // Let's just create one dummy user and re-add? No, duplicate entry error.
             // Create a few users.
             $applicant = User::factory()->create([
                 'username' => 'app_user_' . uniqid(),
                 'mobile' => '080' . rand(10000000, 99999999),
             ]);
             SpecApplication::create([
                 'spec_id' => $popular->id,
                 'user_id' => $applicant->id,
                 'status' => 'PENDING',
                 'user_role' => 'participant'
             ]);
        }

        // 3. HOTTEST: Recent + Popular
        // Created today + some applications
        $hottest = Spec::create([
            'user_id' => $user->id,
            'title' => 'Hottest New Spec',
            'description' => 'Created just now and already has applicants.',
            'location_city' => 'Lagos',

            'max_participants' => 20,
            'status' => 'OPEN',
            'expires_at' => Carbon::now()->addDays(3),
            'created_at' => Carbon::now()->subHours(2), // Very fresh
            'updated_at' => Carbon::now(),
        ]);
        
        for ($i = 0; $i < 6; $i++) {
             $applicant = User::factory()->create([
                 'username' => 'hot_user_' . uniqid(),
                 'mobile' => '080' . rand(10000000, 99999999),
             ]);
             SpecApplication::create([
                 'spec_id' => $hottest->id,
                 'user_id' => $applicant->id,
                 'status' => 'PENDING',
                 'user_role' => 'participant'
             ]);
        }

        $this->command->info('seeded: Ongoing, Popular, and Hottest specs.');
    }
}
