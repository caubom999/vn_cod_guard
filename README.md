# Vietnam COD Guard

Shopify embedded app for Vietnam COD order protection, built with NestJS, React, Polaris, App Bridge, Prisma, and MySQL.

## Stack

- Shopify CLI app workspace
- NestJS backend in `web`
- React + Vite frontend in `web/frontend`
- Prisma + MySQL
- Minimal theme app extension in `extensions/vn-cod-guard-theme-extension`

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   npm install --prefix web
   npm install --prefix web/frontend
   ```

2. Create env files:

   ```bash
   cp .env.example .env
   cp web/.env.example web/.env
   ```

3. Start MySQL:

   ```bash
   docker compose up -d mysql
   ```

4. Generate Prisma client:

   ```bash
   npm run prisma:generate --prefix web
   ```

5. Run the Shopify app:

   ```bash
   npm run dev
   ```

## Useful Commands

```bash
npm run dev
npm run build
npm run deploy
npm run prisma:generate --prefix web
npm run build --prefix web
npm run build --prefix web/frontend
```

## App API

- `GET /health`
- `GET /api/auth`
- `GET /api/auth/callback`
- `GET /api/shop/me`

All app API routes should use Shopify session token authentication. On the frontend, reuse `useApi()` from `web/frontend/hook/api.ts`.
