# AP Data

Adaptivity Performance's own repair-information system for technicians — the
same kind of tool as ALLDATA, Mitchell 1 ProDemand and Identifix Direct-Hit,
built on public data and on what this shop learns on every job.

Phone-first web app. Techs sign in with their existing Adaptivity accounts.

## What it does

| Area | What a tech gets | Where the data comes from |
| --- | --- | --- |
| **Vehicle** | VIN decode (typed or scanned from the door-jamb barcode), year/make/model, recent vehicles | NHTSA vPIC |
| **Recalls** | Every safety recall for the vehicle, do-not-drive and park-outside first, link to the open-recall check for the VIN | NHTSA |
| **Common problems** | What owners report most, by system, with the newest complaints | NHTSA owner complaints |
| **Trouble codes** | 293 generic OBD-II codes: meaning, symptoms, likely causes in order, test steps, related codes, how-to links. Any other code is explained by its structure | AP Data library |
| **Shop code book** | What manufacturer codes (P1xxx, B/C/U) mean on a make | Techs |
| **Confirmed fixes** | Search by codes and symptom; fixes ranked by how close the vehicle is (this vehicle → same model ±2 yrs → same engine → same make), shared codes, and how many techs confirmed them. "This fixed mine too" | Techs |
| **Repair info** | 31 built-in tests and procedures (compression, fuel trim, CAN bus, brakes, cooling…) with steps, how to read results and what to look up; shop procedures scoped to make/model/years | AP Data library + techs |
| **Specs** | Torque, fluids, capacities per vehicle, verified by a second tech | Techs |
| **Labor guide** | ~90 standard jobs; admin book hours (all vehicles, make, model or one vehicle) and real logged times (median, range); estimate builder at the shop / diesel / European rate | Admins + techs |
| **Shop files** | Component-location photos, diagrams and PDFs per vehicle | Techs |
| **Shop notes** | Quick notes per vehicle, shared with the admin portal's Research tab | Techs |

### What it does not include

Factory repair manuals, OEM wiring diagrams, published labor-guide times and
other services' fix databases are licensed content (from the automakers and
from ALLDATA, Mitchell 1 and Identifix). AP Data does not copy any of it. The
built-in code library and articles are written for AP Data and stay
vehicle-agnostic: each article lists the vehicle-specific values to look up in
the factory service information, and the Specs screen is where techs record
them for next time.

## How it fits together

- **This repo** — React 19 + TypeScript + Vite + Tailwind 4 single-page app,
  hash-routed (`#/codes/P0300`) so it runs on GitHub Pages at any path.
- **Supabase** — the AdaptivityPerformance project
  (`qqyairzymqpkbfxobztx`), shared with the website and the tech and
  customer apps. Sign-in, data and file storage.
  - Tables come from the migration
    `supabase/migrations/20261023200000_ap_data_repair_information.sql` in
    the **AdaptivityPerformance** repo, which owns that project's migration
    history. Everything is staff-only by row-level security: admins and techs
    read and add; the author or an admin edits and deletes.
  - NHTSA lookups go through the existing `vehicle-research` edge function
    (NHTSA sends no CORS headers, so a browser cannot ask it directly).
- `src/lib/vehicleLaborRate.ts` is a copy of the website's rate rules so
  estimates bill diesel and European vehicles the same way quotes do.

```
src/
  api/         Supabase reads and writes, one file per table
  components/  Layout, vehicle picker, shared UI
  data/        Code library, articles, labor job catalog, systems
  lib/         Pure logic (vehicle matching, fix ranking, labor math, codes) + auth, router
  pages/       Screens
tests/         node --test unit tests for everything in lib/ and data/
```

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run lint
npm run build    # typecheck + production build into dist/
```

`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` override the production
project (see `.env.example`).

## Deploying

Pushes to `main` deploy to GitHub Pages (`.github/workflows/deploy.yml`).
Turn it on once in **Settings → Pages → Source: GitHub Actions**. Pull
requests run lint, tests and the build (`.github/workflows/ci.yml`).

Before the first use, apply the AP Data migration to the Supabase project.
The About screen (menu → About AP Data) shows whether each table is ready.
