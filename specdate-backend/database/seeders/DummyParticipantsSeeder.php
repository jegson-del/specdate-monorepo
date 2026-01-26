<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Spec;
use App\Models\SpecApplication;
use Illuminate\Support\Facades\DB;

class DummyParticipantsSeeder extends Seeder
{
    public function run()
    {
        $spec = Spec::latest()->first();

        if (!$spec) {
            $this->command->error("No Spec found! Please create a Spec first.");
            return;
        }

        $this->command->info("Seeding participants for Spec: {$spec->title}");

        DB::transaction(function () use ($spec) {
            $users = User::factory(5)->state(function (array $attributes) {
                return [
                    'username' => fake()->unique()->userName(),
                    'mobile' => fake()->phoneNumber(),
                ];
            })->create();

            foreach ($users as $user) {
                // detailed profile
                UserProfile::create([
                    'user_id' => $user->id,
                    'full_name' => $user->name,
                    'dob' => '1995-06-15',
                    'sex' => fake()->randomElement(['female', 'male']),
                    'city' => fake()->city(),
                    'country' => 'USA',
                    'profile_completed_at' => now(),

                ]);

                // application
                SpecApplication::create([
                    'spec_id' => $spec->id,
                    'user_id' => $user->id,
                    'user_role' => 'participant',
                    'status' => 'ACCEPTED'
                ]);

                $this->command->info("Added user {$user->name} ({$user->email})");
            }
        });

        $this->command->info("Done! 5 participants added.");
    }
}
