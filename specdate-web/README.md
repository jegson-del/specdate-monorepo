# DateUsher Web

Vite/React web app for the public DateUsher site, provider registration, legal pages, and admin dashboard.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

By default, local API calls use the Vite proxy target in `VITE_API_PROXY_TARGET`.

## Verification

```bash
npm run build
npm run lint
```

## Environment

Production should set:

```dotenv
VITE_API_URL=https://dateusher.org
VITE_PUSHER_APP_KEY=
VITE_PUSHER_HOST=ws-eu.pusher.com
VITE_PUSHER_PORT=443
VITE_PUSHER_SCHEME=https
VITE_PUSHER_APP_CLUSTER=eu
```

Only `VITE_*` values are exposed to the browser. Do not add backend secrets such as `PUSHER_APP_SECRET`.

## Repo Split Checklist

- Keep `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, TypeScript configs, `src`, `public`, and `.env.example`.
- Do not commit `.env`, `dist`, `node_modules`, or temporary logs.
- After splitting, run `npm install` and `npm run build`.
