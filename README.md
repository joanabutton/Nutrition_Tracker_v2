# Nutrition Tracker v2

Private, mobile-first nutrition tracking application. This repository currently contains the Phase 1 foundation, Phase 2 profile and target setup, the Phase 3 Today dashboard, Phase 4 manual food logging, Phase 5 external food lookup, Phase 6 conversational food logging, and Phase 7 intelligent fallback.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

3. Create a Supabase project, then add the project URL and anon key to `.env.local`.
   Leave `APP_TIME_ZONE=Europe/London` unless you want dashboard days calculated in a different timezone.

4. Apply the SQL migrations in `supabase/migrations` using the Supabase SQL editor or Supabase CLI.

5. Start the development server:

```bash
npm run dev
```

6. Open `http://localhost:3000`.

Without Supabase values, the app will still start and show the login screen with a setup message,
but authentication will not work until `.env.local` is configured.

## Environment Variables

Required for Phase 1:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Used by server-side food lookup. Do not expose these in client code:

```bash
USDA_FOODDATA_API_KEY=
OPEN_FOOD_FACTS_USER_AGENT=
```

Used only by local import scripts. Keep this server-side/local only, and never expose it in browser code:

```bash
SUPABASE_SERVICE_ROLE_KEY=
```

Used by server-side conversational food parsing. Do not expose this in client code:

```bash
OPENAI_API_KEY=
OPENAI_FOOD_PARSER_MODEL=gpt-5-mini
OPENAI_FOOD_ESTIMATOR_MODEL=gpt-5-mini
```

Used server-side to sign confirmation drafts so browser edits are limited to the intended fields:

```bash
APP_DRAFT_SIGNING_SECRET=
```

Optional:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_TIME_ZONE=Europe/London
```

## Available Scripts

```bash
npm run dev
npm run build
npm run import:portfir:dry-run
npm run import:portfir
npm run lint
npm run test
npm run typecheck
```

## Importing PortFIR Reference Foods

The PortFIR / INSA BDCA workbook is imported into Supabase as shared reference data,
not bundled into the app. This keeps lookup working from an iPhone or deployed app.

1. Apply `supabase/migrations/002_reference_foods.sql` in the Supabase SQL editor.
   Apply `supabase/migrations/003_saved_food_search_indexes.sql` and
   `supabase/migrations/004_food_search_trigram_indexes.sql` as well for food search indexes.
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`. Use the service role key only locally/server-side.
3. Check the workbook parsing:

```bash
npm run import:portfir:dry-run
```

4. Upload/update the reference rows:

```bash
npm run import:portfir
```

The importer reads `data/insa_tca.xlsx`, which identifies as INSA BDCA `v 7.1 - 2026`.
It imports values per 100 g, stores total sugars when provided, and leaves added sugar unknown.

## Nutrition Calculations

Phase 2 target recommendations are deterministic. BMR uses the Mifflin-St Jeor equation, TDEE
uses standard activity multipliers, and weight-change goals use an approximate 7,700 kcal per kg
weekly adjustment. The generated targets are starting recommendations only; the user can edit and
save every target manually.

## Phase Notes

The Today dashboard reads current-day food and exercise rows. Manual food creation, daily food logging, external food lookup, and conversational food parsing are available. Saved-food lists and logging controls are searchable and capped so they remain usable as the personal database grows. PortFIR reference search works after applying the reference migration and running the importer. Open Food Facts search works with a descriptive `OPEN_FOOD_FACTS_USER_AGENT`; USDA FoodData Central search requires `USDA_FOODDATA_API_KEY`. Conversational food logging parses natural language into structured items, matches saved/reference/external foods, and requires confirmation before saving. When a food cannot be safely resolved or logged with database units, Phase 7 can use a server-side LLM fallback to create an explicitly `estimated` log row. Exercise entry, weight tracking, or PWA configuration are reserved for later phases in `SPEC.md`.
