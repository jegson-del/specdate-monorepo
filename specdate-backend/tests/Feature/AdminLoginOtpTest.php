<?php

namespace Tests\Feature;

use App\Mail\OtpMail;
use App\Models\AdminAccess;
use App\Models\User;
use Database\Seeders\AdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AdminLoginOtpTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_password_login_requires_email_otp_before_token_is_issued(): void
    {
        Mail::fake();
        $admin = $this->approvedAdmin([
            'email' => 'admin@example.com',
        ]);

        $response = $this->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.requires_otp', true)
            ->assertJsonPath('data.email', $admin->email)
            ->assertJsonMissingPath('data.token');

        Mail::assertSent(OtpMail::class, fn (OtpMail $mail) => $mail->hasTo($admin->email));
    }

    public function test_admin_can_exchange_valid_otp_for_dashboard_token(): void
    {
        Mail::fake();
        $admin = $this->approvedAdmin([
            'email' => 'admin@example.com',
        ]);

        $login = $this->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk();

        $challenge = $login->json('data.login_challenge');
        $otp = Cache::get('otp:email:' . strtolower($admin->email));

        $this->postJson('/api/admin/login/verify-otp', [
            'email' => $admin->email,
            'login_challenge' => $challenge,
            'otp_code' => $otp,
        ])
            ->assertOk()
            ->assertJsonPath('data.user.email', $admin->email)
            ->assertJsonPath('data.user.role', 'admin')
            ->assertJsonStructure(['data' => ['token']]);
    }

    public function test_wrong_admin_otp_is_rejected_without_issuing_token(): void
    {
        Mail::fake();
        $admin = $this->approvedAdmin([
            'email' => 'admin@example.com',
        ]);

        $login = $this->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk();

        $this->postJson('/api/admin/login/verify-otp', [
            'email' => $admin->email,
            'login_challenge' => $login->json('data.login_challenge'),
            'otp_code' => '000000',
        ])
            ->assertStatus(422)
            ->assertJsonMissingPath('data.token');
    }

    public function test_expired_admin_login_challenge_is_rejected(): void
    {
        Mail::fake();
        $admin = $this->approvedAdmin([
            'email' => 'admin@example.com',
        ]);

        $login = $this->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk();

        $challenge = $login->json('data.login_challenge');
        Cache::forget('admin_login_challenge:' . hash('sha256', $challenge));

        $this->postJson('/api/admin/login/verify-otp', [
            'email' => $admin->email,
            'login_challenge' => $challenge,
            'otp_code' => Cache::get('otp:email:' . strtolower($admin->email)),
        ])->assertStatus(422);
    }

    public function test_non_admin_user_cannot_start_admin_otp_login(): void
    {
        Mail::fake();
        $user = User::factory()->create([
            'email' => 'user@example.com',
            'role' => 'user',
        ]);

        $this->postJson('/api/admin/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertForbidden();

        Mail::assertNothingSent();
    }

    public function test_review_admin_can_bypass_login_otp_when_env_flag_is_enabled(): void
    {
        Mail::fake();
        Config::set('admin.login_otp.review_bypass_enabled', true);
        Config::set('admin.login_otp.review_bypass_email', 'tayojegede1981@gmail.com');

        $admin = $this->approvedAdmin([
            'email' => 'tayojegede1981@gmail.com',
        ]);

        $this->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('message', 'Admin logged in successfully.')
            ->assertJsonPath('data.requires_otp', false)
            ->assertJsonPath('data.user.email', $admin->email)
            ->assertJsonStructure(['data' => ['token']]);

        Mail::assertNothingSent();
        $this->assertFalse(Cache::has('otp:email:' . strtolower($admin->email)));
    }

    public function test_review_admin_still_requires_login_otp_when_env_flag_is_disabled(): void
    {
        Mail::fake();
        Config::set('admin.login_otp.review_bypass_enabled', false);
        Config::set('admin.login_otp.review_bypass_email', 'tayojegede1981@gmail.com');

        $admin = $this->approvedAdmin([
            'email' => 'tayojegede1981@gmail.com',
        ]);

        $this->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('data.requires_otp', true)
            ->assertJsonMissingPath('data.token');

        Mail::assertSent(OtpMail::class, fn (OtpMail $mail) => $mail->hasTo($admin->email));
    }

    public function test_review_otp_bypass_does_not_apply_to_other_admins(): void
    {
        Mail::fake();
        Config::set('admin.login_otp.review_bypass_enabled', true);
        Config::set('admin.login_otp.review_bypass_email', 'tayojegede1981@gmail.com');

        $admin = $this->approvedAdmin([
            'email' => 'other-admin@example.com',
        ]);

        $this->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonPath('data.requires_otp', true)
            ->assertJsonMissingPath('data.token');

        Mail::assertSent(OtpMail::class, fn (OtpMail $mail) => $mail->hasTo($admin->email));
    }

    public function test_admin_seeder_grants_all_current_admin_access_permissions(): void
    {
        $this->seed(AdminSeeder::class);

        $admin = User::where('email', 'tayojegede1981@gmail.com')->firstOrFail();
        $access = $admin->adminAccess()->firstOrFail();
        $permissions = collect(Schema::getColumnListing('admin_accesses'))
            ->filter(fn (string $column) => str_starts_with($column, 'can_'))
            ->values();

        $this->assertSame('admin', $admin->role);
        $this->assertNotNull($access->approved_at);
        $permissions->each(fn (string $permission) => $this->assertTrue((bool) $access->{$permission}, $permission));
    }

    private function approvedAdmin(array $attributes = []): User
    {
        $admin = User::factory()->create(array_merge(['role' => 'admin'], $attributes));
        AdminAccess::create([
            'admin_id' => $admin->id,
            'approved_at' => now(),
        ]);

        return $admin;
    }
}
