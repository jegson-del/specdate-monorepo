<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\UserBalance;

class SparkBalanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();

        foreach ($users as $user) {
            UserBalance::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'red_sparks' => 5,
                    'blue_sparks' => 5
                ]
            );
        }
        $this->command->info('Updated spark balances for ' . $users->count() . ' users.');
    }
}
