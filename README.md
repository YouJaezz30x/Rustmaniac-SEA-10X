# Rustmaniac SEA 10X Website

Full-stack Next.js site for **Rustmaniac SEA 10X**: landing, rules, VIP store, plugin marketplace, auth, admin CRUD, Stripe Checkout, and HTML receipts.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS v4
- Prisma + SQLite (Postgres-ready via `DATABASE_URL`)
- NextAuth (credentials + Steam OpenID stub)
- Stripe Checkout + webhook fulfillment stub

## Quick start

```bash
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seeded accounts

| Role  | Email                   | Password    |
|-------|-------------------------|-------------|
| Admin | `admin@rustmaniac.local` | `admin123!` |
| User  | `player@example.com`     | `player123!` |

Override admin credentials with `ADMIN_EMAIL` / `ADMIN_PASSWORD` before seeding.

## Environment

See `.env.example` for all keys.

### Stripe

1. Create a Stripe account and copy the **test** secret + publishable keys.
2. Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. Forward webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Put the webhook signing secret in `STRIPE_WEBHOOK_SECRET`.

Without Stripe keys, cart still works; checkout returns `501` with a setup hint.

### Steam OpenID

1. Get an API key: [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
2. Set `STEAM_API_KEY` in `.env`.
3. `/api/auth/steam` currently reports configuration status. Wire a Steam OpenID provider (or `openid-client`) against `NEXTAUTH_URL` when ready — credentials auth is fully functional for v1.

## Surfaces

| Path        | Purpose                                      |
|-------------|----------------------------------------------|
| `/`         | Brand hero, banner, staff, announcements     |
| `/rules`    | Server rules                                 |
| `/store`    | VIP packages + duration + cart + checkout    |
| `/plugins`  | Oxide plugin marketplace                     |
| `/reviews`  | Testimonials + submit                        |
| `/login` `/register` | Credentials auth (+ Steam stub)     |
| `/account`  | Orders + receipts                            |
| `/admin`    | CRUD packages/staff/plugins/rules/announcements; mark orders fulfilled |
| `/receipt/[id]` | HTML receipt (print to PDF)               |

## Security (v1)

- httpOnly NextAuth JWT session cookies
- CSRF token cookie + `x-csrf-token` header on mutations
- Zod validation on auth/cart/checkout/admin/review inputs
- Rate limits on register, login, checkout, reviews
- Admin role gate on `/admin` and `/api/admin/*`

## Out of scope (documented stubs)

- Live Rust server status / RCON — placeholder only
- Real Discord bot sync
- In-game auto-grant — webhook marks `PAID`; admins **Mark fulfilled** in `/admin`

## Deploy notes

1. Switch `DATABASE_URL` to Postgres for production.
2. Set strong `NEXTAUTH_SECRET` and production `NEXTAUTH_URL` / `NEXT_PUBLIC_SITE_URL`.
3. Use live Stripe keys + a real webhook endpoint.
4. `npm run build && npm start`

## Brand assets

- Banner: https://files.catbox.moe/0h4gs3.jpg
- Logo: https://files.catbox.moe/5fx3yu.png
- Discord: https://discord.gg/8tNEXgs3qX
