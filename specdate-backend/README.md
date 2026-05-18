# DateUsher Backend

Laravel 12 API for DateUsher mobile, web admin, provider marketplace, moderation, support, media moderation, and realtime admin activity.

## Local Setup

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Optional Vite assets for Laravel-owned views:

```bash
npm run dev
```

Run tests:

```bash
php artisan test
```

## Production Notes

Set `APP_ENV=production`, `APP_DEBUG=false`, and point `APP_URL` to the backend/API origin. Set `FRONTEND_URL` to the public web origin used in emails and redirects.

Recommended Forge worker:

```bash
php artisan queue:work redis --queue=default --sleep=3 --tries=3 --timeout=90
```

For Redis-backed production queues/cache:

```dotenv
QUEUE_CONNECTION=redis
CACHE_STORE=redis
REDIS_CLIENT=phpredis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

## Public Surface

The backend should not serve a marketing homepage. `/` returns `404` with `X-Robots-Tag: noindex, nofollow`, and `/robots.txt` disallows crawling.

Scribe API docs are local-only by default. Set `SCRIBE_ADD_ROUTES=true` only when you intentionally want `/docs`, `/docs.postman`, and `/docs.openapi` exposed.

## Realtime

Backend requires private Pusher credentials:

```dotenv
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=eu
PUSHER_SCHEME=https
```

Never expose `PUSHER_APP_SECRET` to web or mobile clients.

## Repo Split Checklist

- Keep `composer.json`, `composer.lock`, `package.json`, `package-lock.json`, `Dockerfile`, `phpunit.xml`, `.env.example`, `routes`, `database`, `app`, `config`, `resources`, `public`, `storage` placeholders, and `tests`.
- Do not commit `.env`, logs, caches, or generated storage contents.
- After splitting, run `composer install`, `npm install`, `php artisan test`, and `npm run build`.
