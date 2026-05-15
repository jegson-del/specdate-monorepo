<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppVersionTest extends TestCase
{
    use RefreshDatabase;

    public function test_app_version_endpoint_marks_soft_and_forced_updates(): void
    {
        config([
            'mobile.ios.latest_version' => '1.3.0',
            'mobile.ios.minimum_supported_version' => '1.2.0',
            'mobile.ios.store_url' => 'https://apps.apple.com/app/dateusher',
        ]);

        $this->getJson('/api/app-version?platform=ios&version=1.2.1&build=8')
            ->assertOk()
            ->assertJsonPath('data.update_available', true)
            ->assertJsonPath('data.force_update', false)
            ->assertJsonPath('data.store_url', 'https://apps.apple.com/app/dateusher');

        $this->getJson('/api/app-version?platform=ios&version=1.1.9')
            ->assertOk()
            ->assertJsonPath('data.update_available', true)
            ->assertJsonPath('data.force_update', true);
    }

    public function test_app_version_endpoint_requires_known_platform(): void
    {
        $this->getJson('/api/app-version?platform=web')
            ->assertStatus(422);
    }
}
