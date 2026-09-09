# AGENTS.md

## Project Overview

Nutrition Tracker v2 is a private, mobile-first nutrition tracking app for daily personal use. Main workflows are account sign-in/sign-up, onboarding/profile targets, Today dashboard review, food logging, conversational meal logging, saved foods, saved meals, exercise logging, weight logging, and settings updates.

Production architecture: Next.js app hosted on Vercel, Supabase for Postgres/Auth, Supabase RLS for per-user data isolation, and server-side integrations for OpenAI, Open Food Facts, USDA FoodData Central, and Supabase reference food lookup.

## Tech Stack

- Framework/language: Next.js App Router, React, TypeScript.
- Styling/frontend: Tailwind CSS, mobile-first server-rendered pages with client form components where needed.
- Backend/database: Supabase Postgres via `@supabase/ssr` and `@supabase/supabase-js`.
- Authentication: Supabase email/password auth with SSR cookie session handling.
- Hosting/deployment: Vercel.
- External services used by current code: OpenAI Responses API for conversational food parsing/estimation, Open Food Facts API, optional USDA FoodData Central API, Supabase reference foods imported from local PortFIR data.

## Architecture

- `app/`: Next.js routes. `app/(app)/` contains authenticated app pages/actions. `app/login/` contains public auth UI/actions. `app/manifest.ts` and root metadata configure PWA install metadata.
- `components/`: UI and form components. Client components are marked with `"use client"`.
- `lib/supabase/`: Supabase client setup. `client.ts` is browser-side, `server.ts` is server-side, `middleware.ts` refreshes sessions and redirects, `env.ts` contains only public Supabase env access.
- `lib/env.ts`: server-side app env helpers for timezone and API keys.
- `lib/nutrition/`: deterministic nutrition, exercise, external food, reference food, and conversational draft logic.
- `lib/ai/`: OpenAI parsing and fallback estimation calls.
- `lib/dashboard.ts`, `lib/foods.ts`, `lib/profile.ts`, `lib/saved-meals.ts`, `lib/weight.ts`: data access and business aggregation.
- `supabase/migrations/`: schema, RLS, reference-food table, and search indexes.
- `scripts/import-portfir.mjs`: local-only reference food import using `SUPABASE_SERVICE_ROLE_KEY`.

Client/server boundary: browser code may use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Server actions and server modules read private env vars. Never import private env helpers into client components.

Supabase communication: SSR pages/actions create a server Supabase client from cookies. Client components use forms/server actions for writes, with direct browser Supabase client available only for public anon-key browser access.

## Data Model

Main tables:

- `profiles`: one profile per auth user, including targets and exercise eat-back percentage.
- `foods`: user foods plus shared foods where `user_id is null`; includes nutrition source and optional external source identifiers.
- `food_logs`: daily copied nutrition values, meal type, optional `food_id`, provenance, and original user text.
- `saved_meals`: user-owned reusable meal definitions with aliases.
- `saved_meal_items`: saved-meal lines referencing `foods`.
- `exercise_logs`: user exercise entries with deterministic calorie estimates and estimation method.
- `weight_logs`: user weight history.
- `reference_foods`: shared imported reference data, readable by authenticated users.

Important relationships: most user-owned rows reference `auth.users(id)` with RLS policies enforcing `auth.uid() = user_id`. Food logs keep copied nutrition so historical logs survive food edits/deletes. Saved meal items restrict deleting referenced foods. Reference foods are shared lookup data, not user-owned logs.

Migration conventions: use SQL migrations under `supabase/migrations`. Do not reset production. Existing migrations create schema/RLS/indexes; later changes should be additive and data-preserving unless the user explicitly approves otherwise.

## Important Application Flows

- Dashboard loading: `app/(app)/today/page.tsx` calls `getTodayDashboard()`, `getFoods()`, `getSavedMeals()`, `searchReferenceFoods()`, and `searchExternalFoods()`; missing profile redirects to `/onboarding`.
- Food logging: `app/(app)/food-actions.ts` validates form data, finds or creates a food if needed, scales nutrition with `scaleFoodNutrition()`, inserts `food_logs`, then revalidates Today/Foods/Meals.
- Conversational food logging: `parseConversationalFoodLog()` first tries saved-meal matching, otherwise calls `parseFoodLogText()`, resolves foods, signs the draft with `APP_DRAFT_SIGNING_SECRET`, requires confirmation, validates edits/selections, then inserts logs.
- Nutrition resolution: saved foods are searched first, then Supabase `reference_foods`, then Open Food Facts/USDA. Unresolved or unsupported-unit items can use OpenAI fallback estimates, but confirmed logs still preserve provenance.
- Saved foods/meals: manual or external foods live in `foods`; saved meals live in `saved_meals` plus `saved_meal_items`. Saved-meal free-text supports simple omissions/replacements such as "without banana" or "strawberries instead of banana".
- Exercise logging: manual/text actions parse supported exercise types, use profile weight, estimate calories deterministically in `lib/nutrition/exercise.ts`, then store `exercise_logs`.
- Weight logging: weight actions insert/update/delete `weight_logs`, sync latest profile weight, and revalidate Weight/Today/Settings.
- Authentication: middleware redirects unauthenticated app routes to `/login`; app layout also requires a Supabase user. Login actions call Supabase password sign-in/sign-up.

## Nutrition / Business Logic

- Preserve deterministic calculations. BMR/TDEE/targets, food scaling, daily totals, exercise calories, and weight trends are deterministic code paths with tests.
- LLMs parse intent and estimate fallback nutrition only when needed; do not replace deterministic nutrition math with LLM-generated calculations.
- Data-source priority is saved foods first, then local reference foods, then external APIs, then AI fallback for unresolved/unsupported cases.
- Provenance matters: `nutrition_source` values include `verified`, `calculated`, `estimated`, and `user_provided`. Estimated rows must remain visibly distinct in data and UI.
- Food logs copy calculated nutrient values at logging time rather than depending on current food rows.
- Added sugar may be unknown. Scaling keeps `added_sugar_g` as `null` when unknown; meal totals become unknown if any item has unknown added sugar. Open Food Facts currently stores added sugar as `null`; PortFIR import stores total sugars but added sugar as `null`.
- Unit support is intentionally conservative: logging/scaling requires matching normalized units unless a fallback estimate converts the quantity.

## Environment And Deployment

Required for deployed core app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `APP_DRAFT_SIGNING_SECRET`

Required for conversational food logging/AI fallback:

- `OPENAI_API_KEY`

Optional/defaulted:

- `OPENAI_FOOD_PARSER_MODEL` defaults to `gpt-5-mini`.
- `OPENAI_FOOD_ESTIMATOR_MODEL` defaults to `gpt-5-mini`.
- `APP_TIME_ZONE` defaults to `Europe/Lisbon`.
- `OPEN_FOOD_FACTS_USER_AGENT` has a default but should be set descriptively in production.
- `USDA_FOODDATA_API_KEY` enables USDA lookup.
- `SUPABASE_SERVICE_ROLE_KEY` is local-only for `scripts/import-portfir.mjs`; do not add it to Vercel for normal app use.

Commands:

- Local dev: `npm run dev`
- Lint: `npm run lint`
- Type-check: `npm run typecheck`
- Tests: `npm run test`
- Production build: `npm run build`
- PortFIR dry run/import: `npm run import:portfir:dry-run`, `npm run import:portfir`

Vercel deployment uses the standard Next.js build. Supabase production Auth settings must include the deployed Vercel URL as Site URL and redirect URL. PWA support is manifest/icon/apple-web-app metadata only; iPhone install is via Safari Add to Home Screen on the HTTPS production URL.

## Development Safeguards

- Do not commit secrets, `.env`, `.env.local`, `.env.production`, or dataset files under `data/`.
- Never expose `APP_DRAFT_SIGNING_SECRET`, `OPENAI_API_KEY`, `USDA_FOODDATA_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` to client code.
- Never reset, truncate, or destructively modify the production Supabase database without explicit user instruction.
- Preserve existing user data and historical log semantics.
- Use migrations for schema changes; prefer additive, reversible, data-preserving migrations.
- Run relevant checks before considering work complete, usually `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` for deployment-impacting work.
- Prefer small targeted changes over broad refactors.
- Do not replace deterministic nutrition calculations with AI outputs.

## Current State

Implemented features: Supabase auth, profile/onboarding and editable targets, Today dashboard, manual saved foods, external/reference food lookup, conversational food logging with signed confirmation drafts, AI fallback estimates, saved meals and aliases, exercise logging, weight logging/trends, mobile-first app shell, and PWA install metadata.

Known evidenced limitations:

- No custom offline service worker or background sync; PWA support is install metadata/icons.
- `SUPABASE_SERVICE_ROLE_KEY` is only for local PortFIR imports; production app uses anon-key user sessions and RLS.
- USDA lookup is unavailable without `USDA_FOODDATA_API_KEY`.
- Non-running exercise distance is ignored; non-running estimates require duration.
- Unit conversion is limited and conservative; unsupported units rely on confirmation/fallback instead of broad automatic conversion.
