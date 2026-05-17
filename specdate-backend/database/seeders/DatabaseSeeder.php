<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $this->call([
            AdminSeeder::class,
            CreditProductSeeder::class,
        ]);

        if (app()->environment('production')) {
            return;
        }

        if ((bool) env('SEED_DEMO_DATA', false)) {
            $this->call([
                FilterTestSeeder::class,
                DummyParticipantsSeeder::class,
            ]);
        }

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
    }
}
