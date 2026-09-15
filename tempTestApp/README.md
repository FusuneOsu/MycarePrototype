# Hello World — Cloudflare Pages + Workers (Pages Functions) + D1

A minimal test project to verify your Cloudflare Pages + D1 setup works
end-to-end. It has:

- `public/index.html` — static frontend (Cloudflare Pages)
- `functions/api/hello.js` — a Pages Function (runs on Workers) that reads
  and writes rows in a D1 database
- `schema.sql` — table + seed data for D1
- `wrangler.toml` — Pages/D1 config

## 1. Install

```bash
npm install
```

## 2. Log in to Cloudflare

```bash
npx wrangler login
```

## 3. Create the D1 database

```bash
npm run db:create
```

This prints a `database_id`. Copy it into `wrangler.toml`, replacing
`REPLACE_WITH_YOUR_D1_DATABASE_ID`.

## 4. Load the schema

Local (for `wrangler pages dev`, uses a local SQLite emulation):

```bash
npm run db:init:local
```

Remote (the actual hosted D1 database, needed before your first deploy):

```bash
npm run db:init:remote
```

## 5. Run locally

```bash
npm run dev
```

Visit the printed local URL (usually `http://localhost:8788`). You should
see the seeded greetings and be able to add new ones — each add is a real
`INSERT` into your local D1 emulation.

## 6. Deploy

```bash
npm run deploy
```

Follow the prompt to create/select your Pages project. Once deployed, go to
the Cloudflare dashboard → Pages → your project → **Settings → Functions →
D1 database bindings**, and confirm the `DB` binding points at
`hello-cf-db`. (The dashboard binding is what the *deployed* site actually
uses; `wrangler.toml`'s `[[d1_databases]]` block is what `wrangler pages
deploy` uses to set that binding automatically — if you deploy via the
CLI you shouldn't need to touch the dashboard, but it's the first place to
check if `/api/hello` 500s in production.)

## How it proves the setup works

- Page loads from **Pages** (static hosting).
- `/api/hello` GET/POST run as a **Pages Function**, which is Cloudflare's
  Workers runtime attached to your Pages project.
- Both routes touch **D1** via the `env.DB` binding — a successful load and
  a successful "Add to D1" confirm Pages, Functions, and D1 are all wired
  together correctly.

## Troubleshooting

- **500 on `/api/hello`**: usually the `database_id` in `wrangler.toml` is
  still the placeholder, or the schema hasn't been loaded remotely.
- **`env.DB` is undefined**: the D1 binding name in the dashboard doesn't
  match `DB` — check Settings → Functions → D1 database bindings.
- **Works locally, not in prod**: you probably ran `db:init:local` but not
  `db:init:remote`.
