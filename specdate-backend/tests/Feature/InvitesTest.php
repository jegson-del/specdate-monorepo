<?php

namespace Tests\Feature;

use App\Mail\AdminInviteMail;
use App\Mail\ProviderInviteMail;
use App\Models\AdminAccess;
use App\Models\AdminInvite;
use App\Models\ProviderInvite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InvitesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_invite_and_approve_admin_after_otp_registration(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->adminWithAccess(manageAdmins: true));

        $this->postJson('/api/admin/management/admin-invites', [
            'name' => 'Ops Admin',
            'email' => 'ops@example.com',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $invite = AdminInvite::where('email', 'ops@example.com')->firstOrFail();
        $token = null;
        Mail::assertQueued(AdminInviteMail::class, function (AdminInviteMail $mail) use (&$token) {
            parse_str(parse_url($mail->inviteUrl, PHP_URL_QUERY) ?: '', $query);
            $token = $query['token'] ?? null;
            return $mail->invite->email === 'ops@example.com' && is_string($token);
        });

        $this->postJson('/api/admin-invites/send-otp', ['token' => $token])->assertOk();
        $otp = Cache::get('otp:email:ops@example.com');

        $this->postJson('/api/admin-invites/register', [
            'token' => $token,
            'name' => 'Ops Admin',
            'username' => 'ops-admin',
            'email' => 'ops@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'otp_code' => $otp,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'awaiting_approval');

        $registeredAdmin = User::where('email', 'ops@example.com')->firstOrFail();
        $this->assertSame('admin', $registeredAdmin->role);
        $this->assertNull($registeredAdmin->adminAccess?->approved_at);

        Sanctum::actingAs($this->adminWithAccess(manageAdmins: true));
        $this->postJson("/api/admin/management/admin-invites/{$invite->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertNotNull($registeredAdmin->fresh('adminAccess')->adminAccess->approved_at);
    }

    public function test_provider_invite_is_marked_accepted_when_provider_registers(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->adminWithAccess(manageProviderInvites: true));

        $this->postJson('/api/admin/provider-invites', [
            'provider_name' => 'Invite Bistro',
            'email' => 'bistro@example.com',
            'service_type' => 'restaurant',
            'personal_message' => 'We think your venue would be a beautiful fit.',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $invite = ProviderInvite::where('email', 'bistro@example.com')->firstOrFail();
        $token = null;
        Mail::assertQueued(ProviderInviteMail::class, function (ProviderInviteMail $mail) use (&$token) {
            parse_str(parse_url($mail->inviteUrl, PHP_URL_QUERY) ?: '', $query);
            $token = $query['invite'] ?? null;
            return $mail->invite->email === 'bistro@example.com' && is_string($token);
        });

        Cache::put('otp:email:bistro@example.com', '123456', 600);

        $this->postJson('/api/provider-registrations', [
            'business_name' => 'Invite Bistro',
            'service_type' => 'restaurant',
            'email' => 'bistro@example.com',
            'address' => '12 Date Street, London',
            'city' => 'London',
            'postcode' => 'SW1A 1AA',
            'country_code' => 'GB',
            'country_name' => 'United Kingdom',
            'phone' => '+447700900555',
            'notes' => 'Private dining and date menus.',
            'otp_code' => '123456',
            'invite_token' => $token,
        ])->assertCreated();

        $this->assertNotNull($invite->fresh()->accepted_at);
        $this->assertNotNull($invite->fresh()->created_provider_profile_id);
    }

    private function adminWithAccess(bool $manageAdmins = false, bool $manageProviderInvites = false): User
    {
        $admin = User::factory()->create(['role' => 'admin']);
        AdminAccess::create([
            'admin_id' => $admin->id,
            'approved_at' => now(),
            'can_manage_admin_users' => $manageAdmins,
            'can_manage_provider_invites' => $manageProviderInvites,
        ]);

        return $admin;
    }
}
