<?php

namespace Database\Seeders;

use App\Models\AdminAccess;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = strtolower(trim((string) config('admin.seed.email', 'tayojegede1981@gmail.com')));
        $username = (string) config('admin.seed.username', 'dateusher-admin');

        $admin = User::query()
            ->where('email', $email)
            ->orWhere('email', 'admin@dateusher.test')
            ->orWhere('username', $username)
            ->first() ?? new User();

        $admin->forceFill([
            'email' => $email,
            'name' => config('admin.seed.name', 'DateUsher Admin'),
            'username' => $username,
            'mobile' => config('admin.seed.mobile', '+10000000000'),
            'password' => Hash::make((string) config('admin.seed.password', 'password')),
            'role' => 'admin',
            'terms_accepted' => true,
        ])->save();

        AdminAccess::updateOrCreate(
            ['admin_id' => $admin->id],
            array_merge(
                $this->allPermissionAccess(),
                [
                    'approved_at' => now(),
                ],
            )
        );
    }

    private function allPermissionAccess(): array
    {
        if (! Schema::hasTable('admin_accesses')) {
            return [];
        }

        return collect(Schema::getColumnListing('admin_accesses'))
            ->filter(fn (string $column) => str_starts_with($column, 'can_'))
            ->mapWithKeys(fn (string $column) => [$column => true])
            ->all();
    }
}
