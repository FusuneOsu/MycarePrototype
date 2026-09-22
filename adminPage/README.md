# myCare Admin — Prototype

Admin dashboard prototype for a patient/caregiver system. Built with React
(Vite) + React Router, deployed as a Cloudflare Pages static site with a
Cloudflare D1 (SQLite) database called **mycarePrototypeRDBMS** for future
wiring.

Sections: Dashboard, Appointments, Caregivers, Post-Op Patients.
**Caregivers is the only section built out so far** — the rest are
placeholder pages so navigation works end to end.

## Project structure

```
mycare-admin/
├── src/
│   ├── components/
│   │   ├── common/            Sidebar, Topbar — shared app chrome
│   │   └── caregivers/        One folder per piece of UI, each with its
│   │                          own .jsx and .css (no mixed files)
│   ├── pages/                 One page component per route
│   ├── hooks/                 useCaregiverFilters — search/filter logic
│   ├── data/                  Mock data standing in for the D1 API
│   ├── styles/                variables.css (design tokens) + global.css
│   └── layouts/                AppLayout — sidebar + routed content
├── functions/api/             Cloudflare Pages Functions (server-side)
├── db/                        schema.sql + seed.sql for D1
└── wrangler.toml              Pages + D1 configuration
```

Every button, table, and filter bar lives in its own folder under
`src/components/caregivers/`, each with a matching CSS file. Colors,
spacing, type sizes and radii all come from `src/styles/variables.css`
so styling stays consistent as more sections get built.

## 1. Run it locally

```bash
cd mycare-admin
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). You'll land
on the Dashboard placeholder — click **Caregivers** in the sidebar to see
the built-out page: the three dummy action buttons, the searchable/
filterable table, and 12 mock caregivers.

Nothing here talks to a database yet — `src/data/mockCaregivers.js` is the
data source. That's intentional so you can review the UI before any
backend work.

## Stripe test payments

Booking Records (Module 8) generates a real Stripe Checkout link once a
booking is "Service completed":

- `POST /api/bookings/:id/pay-link` — builds a client-side invoice PDF,
  creates a Stripe Checkout Session for the booking amount, and stores the
  invoice + checkout link. Moves the booking to "Link sent (Unpaid)".
- `POST /api/bookings/:id/collect` — for cash/DuitNow/bank transfer payments
  collected directly; stores the uploaded receipt and moves the booking to
  "Paid - Collected Directly".
- `POST /api/payments/webhook` — Stripe calls this on
  `checkout.session.completed`; verifies the signature, looks up the Stripe
  hosted receipt, and moves the booking to "Paid - Online".

Without a Stripe key, `pay-link` stays in demo mode (no real charge, but the
booking still moves to "Link sent" so the rest of the flow can be tested).

To enable real Stripe test links:

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

For local dev with `wrangler pages dev`, put the same values in a `.dev.vars`
file at the repo root (gitignored):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

In the Stripe Dashboard (test mode): Developers > Webhooks > Add endpoint,
URL `https://<your-pages-domain>/api/payments/webhook`, event
`checkout.session.completed`. Copy the signing secret it gives you into
`STRIPE_WEBHOOK_SECRET`. Also turn on Settings > Customer emails > "Successful
payments" so Stripe emails the patient a receipt automatically — the same
receipt URL is pulled into the booking record so it can be viewed in-app too.

## 2. Cloudflare account setup (one-time)

You'll need:
- A free Cloudflare account (dash.cloudflare.com/sign-up)
- `wrangler` (already added as a dev dependency — no global install needed)

Log in from the project folder:

```bash
npx wrangler login
```

This opens a browser window to authorize the CLI against your account.

## 3. Create the D1 database

```bash
npm run db:create
```

This runs `wrangler d1 create mycarePrototypeRDBMS` and prints output like:

```toml
[[d1_databases]]
binding = "DB"
database_name = "mycarePrototypeRDBMS"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` value into `wrangler.toml` in this project,
replacing `REPLACE_WITH_YOUR_DATABASE_ID`.

### Load the schema

`db/schema.sql` creates four tables: `caregivers`, `post_op_patients`,
`appointments`, and `pto_requests` — covering all four sections of the
app, not just Caregivers.

```bash
# Local D1 (SQLite file on your machine, used by `wrangler pages dev`)
npm run db:schema:local
npm run db:seed:local

# Remote D1 (the real Cloudflare-hosted database)
npm run db:schema:remote
npm run db:seed:remote
```

Run the `:local` commands while you're developing so `wrangler pages dev`
has data to query. Run the `:remote` commands once, before your first
production deploy.

### Query it directly (optional sanity check)

```bash
npx wrangler d1 execute mycarePrototypeRDBMS --local --command "SELECT * FROM caregivers LIMIT 5;"
```

## 4. Preview with Pages + D1 locally

The plain `npm run dev` (step 1) doesn't know about D1 or Pages Functions.
To test the full stack — including `functions/api/caregivers.js` — locally:

```bash
npm run pages:dev
```

This wraps Vite's dev server with Wrangler's Pages runtime so `/api/*`
routes and the `DB` binding work. Hit `http://localhost:8788/api/caregivers`
to confirm it returns rows from your local D1 database.

**Note:** the Caregivers page UI still reads from `mockCaregivers.js`, not
this endpoint. When you're ready to go live with real data, change
`fetchCaregivers()` in `src/data/mockCaregivers.js` to
`fetch('/api/caregivers')` instead.

## 5. Deploy to Cloudflare Pages

First-time setup — create the Pages project:

```bash
npx wrangler pages project create mycare-admin
```

Then build and deploy:

```bash
npm run pages:deploy
```

This runs `vite build` (outputs to `dist/`) and pushes it with
`wrangler pages deploy dist`. Wrangler prints the live `*.pages.dev` URL
when it finishes.

### Bind D1 in the dashboard too

The `[[d1_databases]]` block in `wrangler.toml` binds D1 for local
`pages:dev`, but production Pages deployments need the binding set in the
Cloudflare dashboard as well:

1. Cloudflare dashboard → Workers & Pages → your `mycare-admin` project
2. Settings → Functions → D1 database bindings
3. Add binding: variable name `DB`, database `mycarePrototypeRDBMS`
4. Redeploy (or it applies on the next deploy)

### Redeploying after changes

```bash
npm run pages:deploy
```

## What's dummy vs. real right now

| Piece | Status |
|---|---|
| Caregiver table, search, filters | Real — runs against `mockCaregivers.js` |
| New Caregiver / PTO Request / Availability Update buttons | Dummy — `alert()` placeholders |
| See more button | Dummy — `alert()` placeholder |
| D1 schema (caregivers, post_op_patients, appointments, pto_requests) | Created, not yet connected to the UI |
| `/api/caregivers` Pages Function | Written, not yet called by the UI |
| Dashboard, Appointments, Post-Op Patients pages | Placeholder only |

## Next steps

- Wire `fetchCaregivers()` to `/api/caregivers` once you're happy with the
  mock version
- Add Pages Functions + forms for New Caregiver, PTO Request, and
  Availability Update (each writes to its respective D1 table)
- Build out Dashboard, Appointments, and Post-Op Patients the same way
  Caregivers was built: page + hook + one-component-per-folder
