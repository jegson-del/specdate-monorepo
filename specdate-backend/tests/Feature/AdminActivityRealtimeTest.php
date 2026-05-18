<?php

namespace Tests\Feature;

use App\Events\AdminActivityCreated;
use App\Models\AdminActivityEvent;
use App\Models\User;
use App\Services\AdminActivityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminActivityRealtimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_activity_service_persists_event_and_broadcasts_it(): void
    {
        Event::fake([AdminActivityCreated::class]);

        $activity = app(AdminActivityService::class)->record(
            'support_ticket_created',
            'New support ticket',
            'A dater opened a support ticket.',
            '/admin/support',
            User::class,
            123,
            ['ticket_id' => 456],
        );

        $this->assertDatabaseHas('admin_activity_events', [
            'id' => $activity->id,
            'type' => 'support_ticket_created',
            'title' => 'New support ticket',
            'route' => '/admin/support',
            'source_type' => User::class,
            'source_id' => 123,
        ]);

        Event::assertDispatched(AdminActivityCreated::class, fn (AdminActivityCreated $event) => (
            (int) $event->activity->id === (int) $activity->id
        ));
    }

    public function test_admin_activity_endpoint_returns_recent_events_and_counts(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        AdminActivityEvent::create([
            'type' => 'provider_application_created',
            'title' => 'New provider application',
            'route' => '/admin/providers',
            'metadata' => ['provider_id' => 10],
            'counts' => ['providers_pending' => 1],
        ]);

        $this->getJson('/api/admin/activity')
            ->assertOk()
            ->assertJsonPath('data.items.0.type', 'provider_application_created')
            ->assertJsonPath('data.items.0.title', 'New provider application')
            ->assertJsonStructure([
                'data' => [
                    'counts' => ['providers_pending'],
                    'items' => [
                        [
                            'id',
                            'type',
                            'title',
                            'route',
                            'metadata',
                            'counts',
                            'created_at',
                        ],
                    ],
                ],
            ]);
    }

    public function test_admin_dashboard_broadcast_channel_uses_sanctum_auth(): void
    {
        config([
            'broadcasting.default' => 'pusher',
            'broadcasting.connections.pusher.key' => 'testing-key',
            'broadcasting.connections.pusher.secret' => 'testing-secret',
            'broadcasting.connections.pusher.app_id' => 'testing-app',
        ]);
        Broadcast::purge('pusher');
        require base_path('routes/channels.php');

        $this->postJson('/broadcasting/auth', [
            'channel_name' => 'private-admin.dashboard',
            'socket_id' => '123.456',
        ])->assertUnauthorized();

        $adminToken = User::factory()
            ->create(['role' => 'admin'])
            ->createToken('test-admin')
            ->plainTextToken;

        $this->withToken($adminToken)->postJson('/broadcasting/auth', [
            'channel_name' => 'private-admin.dashboard',
            'socket_id' => '123.456',
        ])->assertOk();
    }
}
