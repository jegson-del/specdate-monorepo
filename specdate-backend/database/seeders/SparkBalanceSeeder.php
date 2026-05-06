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
                ['credits' => 1]
            );
        }
        $this->command->info('Updated credit balances for ' . $users->count() . ' users.');
    }
}
