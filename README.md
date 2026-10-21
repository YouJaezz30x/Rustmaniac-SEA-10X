# Rustmaniac SEA 10X Website

Full-stack Next.js site for **Rustmaniac SEA 10X**: landing, rules, VIP store, plugin marketplace, auth, admin CRUD, Stripe Checkout, and HTML receipts.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS v4
- Prisma + Postgres (Neon)
- NextAuth (email + Steam OpenID sign-in, Discord account linking)
- Stripe Checkout + webhook with automatic in-game VIP delivery

## Quick start

```bash
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The seed creates the first admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if that account does not exist yet. There are no demo accounts.

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

Without Stripe keys the cart works and checkout returns `501`. Webhook events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`. Each paid order gets a Stripe invoice (PDF linked on the receipt). Turn on payment methods, Link and Adaptive Pricing in the Stripe Dashboard; the code uses dynamic payment methods.

### Steam

Sign-in uses Steam OpenID and needs no key. `STEAM_API_KEY` (https://steamcommunity.com/dev/apikey) adds Steam names and avatars.

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

## Game server connection

`oxide/RustmaniacStore.cs` runs on the Rust server (installed, idle until configured). In
`oxide/config/RustmaniacStore.json` set the website URL and the same `SERVER_API_KEY` as Vercel, then
`oxide.reload RustmaniacStore`. It then:

- polls `/api/server/deliveries` every 30 s and runs `vip give <steamId> <vip|vip+|vip++> [days]`
  (RustmaniacVIP), reporting each result to `/api/server/deliveries/<id>`
- posts player count, queue, map and wipe dates to `/api/server/status` every 60 s

Flow: Stripe `checkout.session.completed` -> order `PAID` -> one delivery per VIP item -> plugin grants
it -> order `FULFILLED`. Failed grants retry 5 times, then alert the Discord webhook; staff can retry
from Admin -> deliveries. VIP checkout requires a linked Steam account.

## Deploy notes

1. Set every variable in `.env.example` on Vercel (Postgres `DATABASE_URL`, strong `NEXTAUTH_SECRET`).
2. The build runs `prisma db push`; run `npm run db:seed` once to load the real rules, VIP kits and
   plugin list. Re-running the seed never overwrites admin edits.
3. Leave `SITE_PUBLIC` unset until launch so search engines don't index the site.
## Brand assets

- Banner: https://files.catbox.moe/0h4gs3.jpg
- Logo: https://files.catbox.moe/5fx3yu.png
- Discord: https://discord.gg/fE5YdJBgyv
