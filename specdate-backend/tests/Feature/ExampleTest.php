<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_root_is_not_a_public_homepage(): void
    {
        $response = $this->get('/');

        $response
            ->assertNotFound()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    public function test_backend_robots_txt_disallows_crawling(): void
    {
        $response = $this->get('/robots.txt');

        $response
            ->assertOk()
            ->assertSee('Disallow: /', false);
    }

    public function test_generated_api_docs_are_not_public_by_default(): void
    {
        $this->get('/docs')->assertNotFound();
    }

    public function test_public_and_protected_api_routes_keep_their_auth_boundary(): void
    {
        $this->getJson('/api/app-version?platform=ios')
            ->assertOk();

        $this->getJson('/api/user')
            ->assertUnauthorized();
    }
}
