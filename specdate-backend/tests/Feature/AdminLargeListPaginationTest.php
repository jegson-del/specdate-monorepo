<?php

namespace Tests\Feature;

use App\Models\ProviderProfile;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminLargeListPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_provider_applications_are_paginated(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        foreach (range(1, 5) as $index) {
            $user = User::factory()->create(['role' => 'provider', 'name' => "Provider {$index}"]);
            $profile = ProviderProfile::create([
                'user_id' => $user->id,
                'company_name' => "Provider {$index}",
                'is_verified' => false,
            ]);
            $profile->forceFill([
                'created_at' => now()->addMinutes($index),
                'updated_at' => now()->addMinutes($index),
            ])->save();
        }

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/providers?status=pending&page=2&per_page=2')
            ->assertOk()
            ->assertJsonPath('data.current_page', 2)
            ->assertJsonPath('data.total', 5)
            ->assertJsonPath('data.data.0.business_name', 'Provider 3')
            ->assertJsonPath('data.data.1.business_name', 'Provider 2');
    }

    public function test_admin_users_are_paginated(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        foreach (range(1, 5) as $index) {
            User::factory()->create([
                'name' => "Paged User {$index}",
                'created_at' => now()->addMinutes($index),
                'updated_at' => now()->addMinutes($index),
            ]);
        }

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/users?role=user&page=2&per_page=2')
            ->assertOk()
            ->assertJsonPath('data.current_page', 2)
            ->assertJsonPath('data.total', 5)
            ->assertJsonPath('data.data.0.name', 'Paged User 3')
            ->assertJsonPath('data.data.1.name', 'Paged User 2');
    }

    public function test_admin_support_tickets_are_paginated(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $user = User::factory()->create();

        foreach (range(1, 5) as $index) {
            $ticket = SupportTicket::create([
                'user_id' => $user->id,
                'category' => 'account',
                'subject' => "Ticket {$index}",
                'status' => 'pending_admin',
                'last_message_at' => now()->addMinutes($index),
            ]);
            $ticket->forceFill([
                'created_at' => now()->addMinutes($index),
                'updated_at' => now()->addMinutes($index),
            ])->save();
        }

        Sanctum::actingAs($admin);

        $this->getJson('/api/support/tickets?status=pending_admin&page=2&per_page=2')
            ->assertOk()
            ->assertJsonPath('data.current_page', 2)
            ->assertJsonPath('data.total', 5)
            ->assertJsonPath('data.data.0.subject', 'Ticket 3')
            ->assertJsonPath('data.data.1.subject', 'Ticket 2');
    }
}
