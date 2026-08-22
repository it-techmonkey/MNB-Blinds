# MNB Blinds — Inventory & Invoicing

Single-admin inventory control and invoicing tool: track product stock and purchasing cost, manage clients and their per-product pricing, and issue PDF invoices. There is no client portal — MNB creates and manages everything himself.

## Architecture

| Layer | Responsibility |
|--------|----------------|
| `src/app/api/**` | REST route handlers (thin): parse input, auth, call services, return JSON/PDF |
| `src/server/services/**` | Business logic (products, clients, invoices, invoice PDFs) |
| `src/server/validation/**` | Zod schemas |
| `src/lib/**` | DB singleton, JWT, HTTP helpers |
| `src/app/**` (pages) | Next.js App Router UI |
| `prisma/` | Schema and migrations |

Stock lives on `products.stock` and is decremented **in a transaction** with `updateMany` + `stock >= quantity` so concurrent invoices cannot oversell. Every restock (a purchase batch) is logged in `product_restocks` with its own cost per unit, since purchasing cost changes from batch to batch — `products.current_cost` always reflects the most recent batch.

Selling price is per client, not per product: `client_product_prices` holds each client's current price for each product. Creating an invoice prefills each line from that table and **upserts** it with whatever price is actually used, so it always reflects the last price charged.

## Tech stack

- **Frontend:** Next.js 15 (React 19), Tailwind CSS 4
- **Backend:** Next.js Route Handlers (same app)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT in **httpOnly** cookie (`auth_token`), single admin account

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ **running** and reachable at `DATABASE_URL`

**Quick local DB (Docker):** from repo root, `docker compose up -d`, then set
`DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mnb_blinds?schema=public"` in `.env`.

## Local setup

1. **Install**

   ```bash
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env`: `DATABASE_URL` (+ `DIRECT_URL` for migrations), `JWT_SECRET` (32+ chars), `ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`.

3. **Database**

   ```bash
   npx prisma migrate dev
   ```

4. **Seed the admin account**

   ```bash
   npm run db:seed
   ```

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## REST API (summary)

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/auth/login` | — |
| `POST` | `/api/auth/logout` | — |
| `GET` | `/api/auth/me` | — |
| `GET` | `/api/products` | `?all=true&activeOnly=true` for picker lists, else paginated |
| `POST` | `/api/products` | Create (code + name are permanent) |
| `GET` / `PUT` | `/api/products/[id]` | `PUT` only accepts `isActive` |
| `POST` | `/api/products/[id]/restock` | Logs a purchase batch, increments stock, updates current cost |
| `GET` | `/api/clients` | `?all=true&activeOnly=true` for picker lists, else full list with invoice totals |
| `POST` | `/api/clients` | Create (code is permanent) |
| `GET` / `PUT` | `/api/clients/[id]` | `GET` includes invoice history |
| `GET` / `PUT` | `/api/clients/[id]/prices` | This client's per-product prices |
| `GET` | `/api/invoices` | Paginated, newest first |
| `POST` | `/api/invoices` | Creates an invoice, decrements stock, updates client prices used |
| `GET` | `/api/invoices/[id]` | — |
| `PUT` | `/api/invoices/[id]/payment-status` | `UNPAID` / `PAID` |
| `GET` | `/api/invoices/[id]/pdf` | Downloads the invoice PDF |

Use `credentials: 'include'` from the browser so the auth cookie is sent.

## Company letterhead

Invoice PDFs pull company details from `src/lib/site.ts` (`COMPANY_LETTERHEAD`) — fill in the real address, VAT number, registration number, and bank details before going live.

## Database schema (reference)

Canonical definition: `prisma/schema.prisma`. Tables: `users` (single admin), `products`, `product_restocks` (purchase batch history), `clients`, `client_product_prices`, `invoices`, `invoice_items`.

## Production notes

- Set a strong `JWT_SECRET`, use HTTPS, keep `secure: true` on cookies (already tied to `NODE_ENV === "production"`).
- Run `npm run build` and `npm start` behind a reverse proxy.
- Point `DATABASE_URL` at your managed PostgreSQL instance.
- To change the admin password, update `ADMIN_PASSWORD` and re-run `npm run db:seed`.

## Folder structure (high level)

```
prisma/
  schema.prisma
  migrations/
  seed.ts
src/
  app/
    api/…              # REST handlers
    dashboard/, products/, clients/, invoices/, reports/
    login/
    layout.tsx, page.tsx, globals.css
  components/          # Shared UI (forms, shell)
  lib/                 # db, auth, api client
  server/
    services/          # Domain logic
    validation/
    errors.ts, serialize.ts
  middleware.ts
```
