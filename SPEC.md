# Personal Nutrition Tracker

## 1. Product Vision

Build a private, mobile-first nutrition and weight-management web application for one primary user.

The application should make food tracking extremely quick by allowing the user to describe food naturally rather than manually searching for every ingredient.

Example:

> "Breakfast was two scrambled eggs with a little olive oil, one slice of sourdough and half an avocado."

The application should interpret the description, resolve the foods and portions, calculate nutritional values, show the interpretation for confirmation, and then add the meal to the user's daily totals.

The application should gradually learn the user's recurring foods and meals so that logging becomes faster and cheaper over time.

The primary goal is not perfect nutritional precision. It is consistent, low-friction tracking with transparent handling of uncertainty.

---

# 2. Core Principles

## 2.1 Mobile first

The application will primarily be used on an iPhone.

Design for:

* fast loading
* one-handed use
* large touch targets
* minimal navigation
* minimal typing
* home-screen installation as a PWA
* today's information immediately visible

The app should feel closer to a small native mobile app than a desktop dashboard.

## 2.2 Conversation first

Natural-language food logging is the primary input method.

Do not require the user to search through large food databases before logging something.

## 2.3 Deterministic calculations

LLMs should interpret language.

They should NOT be responsible for arithmetic that application code can perform reliably.

Examples:

LLM:

* identify foods
* interpret portions
* identify saved meals
* interpret exercise descriptions
* estimate unresolved meals when necessary

Application code:

* calculate calories
* calculate nutrient totals
* calculate BMR/TDEE
* calculate targets
* calculate exercise expenditure
* calculate remaining daily allowance
* calculate weight trends

## 2.4 Be explicit about uncertainty

Every nutrition entry should retain information about where its nutritional values came from.

Use:

* `verified` — nutrition from a reliable food database or product label
* `calculated` — nutrition calculated from known recipe ingredients
* `estimated` — nutrition estimated by an LLM
* `user_provided` — nutrition explicitly supplied by the user

Never silently present an LLM estimate as verified nutritional data.

## 2.5 Learn the user's food universe

The application should gradually prioritise the user's own saved foods and meals over external searches.

The expected progression is:

unknown food → resolved/estimated → confirmed → saved → easily reused

---

# 3. Technology Stack

Preferred stack:

* Next.js
* TypeScript
* React
* Tailwind CSS
* Supabase

  * PostgreSQL
  * authentication
* Vercel deployment
* OpenAI API
* Supabase-hosted reference food data imported from downloaded public datasets
  * PortFIR / INSA Base de Dados da Composição de Alimentos for Portuguese generic foods and prepared dishes
  * McCance and Widdowson / CoFID for UK generic foods and prepared dishes where useful
* USDA FoodData Central API
* Open Food Facts API where useful for European/Portuguese packaged products

Use the simplest implementation that satisfies the requirements.

Avoid unnecessary infrastructure.

The application should remain inexpensive to operate for a single user.

---

# 4. Main Application Screens

## 4.1 Today / Dashboard

This is the default home screen.

Display:

* date
* current calorie consumption
* calorie target
* exercise adjustment
* remaining calories
* macro/nutrient cylinders
* conversational food input
* recent meals/foods
* today's logged meals
* today's exercise

The user should be able to log food without navigating away from this screen.

---

# 5. Nutrition Cylinders

The visual identity of the application should centre around vertical filling cylinders.

Required cylinders:

* Calories
* Protein
* Carbohydrates
* Fat
* Saturated fat
* Fibre
* Added sugar

Each cylinder fills according to today's intake.

There are two conceptual types.

## Target nutrients

Examples:

* protein
* fibre

The goal is to reach approximately the target.

## Limit nutrients

Examples:

* saturated fat
* added sugar

The goal is to remain below the limit.

The UI should visually distinguish these behaviours.

Calories should be the most visually prominent cylinder.

Do not over-design the first implementation. Clean CSS/SVG cylinders are sufficient.

---

# 6. User Profile and Onboarding

The user should initially complete a conversational onboarding.

Collect sufficient information to calculate an appropriate calorie target.

Store structured values such as:

* birth date or age
* sex
* height
* current weight
* activity level
* goal
* desired rate of weight change

The LLM may conduct or interpret the conversation.

The actual BMR/TDEE and calorie target calculations must be performed deterministically in application code using a documented recognised formula.

Show the resulting recommendation to the user.

The user must be able to accept or manually change:

* calorie target
* protein target
* carbohydrate target
* fat target
* saturated fat limit
* fibre target
* added sugar limit

Targets should remain editable in Settings.

Do not continuously change the user's targets automatically.

---

# 7. Food Logging

The primary interface should contain a conversational input.

Example:

> "Had porridge with milk, banana and about 15g walnuts."

The system should convert this into structured food items.

Example:

```json
{
  "meal": "breakfast",
  "items": [
    {
      "food": "rolled oats",
      "quantity": 40,
      "unit": "g"
    },
    {
      "food": "milk",
      "quantity": 150,
      "unit": "ml"
    },
    {
      "food": "banana",
      "quantity": 1,
      "unit": "medium"
    },
    {
      "food": "walnuts",
      "quantity": 15,
      "unit": "g"
    }
  ]
}
```

The structured response should use a strict schema.

Do not parse arbitrary prose downstream when structured output can be used.

---

# 8. Food Resolution Pipeline

## Nutrition Data Source Priority

Use nutrition sources in the following order:

1. **Personal Supabase database — highest priority**
   - Previously confirmed foods, products, recipes and saved meals.
   - Once the user has confirmed nutritional data for a food, reuse that record rather than repeatedly querying external APIs.
   - Supabase is the source of truth for previously confirmed personal foods.

2. **Supabase reference foods — generic/local foods**
   - Search imported reference rows stored in Supabase, not local-only files, so the data works from iPhone and deployed environments.
   - Prefer PortFIR / INSA BDCA for Portuguese foods, Portuguese prepared dishes, and foods commonly named in Portuguese.
   - Prefer McCance and Widdowson / CoFID for UK foods and UK prepared dishes where it better matches the food.
   - Reference rows should be read-only in the app. When the user chooses one, copy it into the personal foods table as a confirmed saved food.
   - Preserve source/version metadata such as `portfir_bdca_v7_1_2026` or `cofid_2021`.
   - Distinguish unknown values from true zero values. PortFIR and CoFID provide total sugars but not added sugar, so `added_sugar_g` should remain unknown unless another reliable source provides it or the user enters it.

3. **Open Food Facts — branded/packaged foods**
   - Prefer for branded Portuguese and European supermarket products.
   - Use barcode or product/brand information when available.

4. **USDA FoodData Central — generic foods and ingredients**
   - Prefer for generic foods such as eggs, oats, fruit, vegetables, meat, fish, rice, legumes, nuts and oils.
   - Do not prefer a US branded product when the user is referring to a generic food, a known European product, or a Portuguese/UK food that is better represented by PortFIR or CoFID.

5. **LLM estimation — fallback only**
   - Use when the meal or food cannot be adequately resolved from the sources above.
   - LLM-estimated nutrition must always be marked `estimated`.
   - Never overwrite verified or user-confirmed nutritional data with an LLM estimate.

When multiple sources are available, prefer the source that most specifically represents the food actually consumed rather than simply accepting the first search result.

Use the following hierarchy.

## Step 1 — Personal database

Search the user's:

* saved foods
* saved meals
* recently used foods
* recipes

Prefer exact or strong personal matches.

The saved-food UX must continue to work when the user has hundreds of foods:

* do not render an unbounded saved-food list by default
* provide saved-food search/filtering on the Foods screen
* prefer recent and strong personal matches in logging controls
* keep the Today food picker constrained and searchable/recent-first
* show personal saved foods before reference/external database matches when the same query is used

## Step 2 — External nutrition databases

For unresolved basic ingredients, use appropriate external food data.

Preferred sources:

* Supabase reference foods imported from PortFIR / INSA BDCA for Portuguese foods
* Supabase reference foods imported from McCance and Widdowson / CoFID for UK foods
* USDA FoodData Central for generic ingredients
* Open Food Facts for packaged European/Portuguese foods where appropriate

## Step 3 — Resolve known ingredients

Combine resolved foods and quantities.

Nutrition arithmetic must be performed in application code.

## Step 4 — LLM fallback

If the meal cannot reasonably be resolved from known foods/databases, send the unresolved description to an LLM capable of nutritional estimation.

Example:

> "A normal bowl of homemade lentil dhal with basmati rice."

The model may estimate:

* likely ingredients
* likely serving sizes
* calories
* protein
* carbohydrates
* fat
* saturated fat
* fibre

Added sugar should NOT normally be invented by the LLM.

The response must be marked:

`estimated`

## Step 5 — Confirmation

Never silently commit uncertain interpretations.

Show a compact confirmation card.

Example:

> I understood:
>
> Lentil dhal — approximately 300 g
> Basmati rice — approximately 150 g
>
> Estimated: 520 kcal
>
> [Add to lunch] [Edit]

The user should be able to adjust quantities or foods before saving.

## Step 6 — Save

After confirmation:

* add food/meal to the daily log
* update nutrition totals
* retain nutrition source metadata

Optionally allow the entry to become a reusable saved meal.

---

# 9. AI Model Strategy

Optimise for low API cost.

Use a relatively inexpensive model for routine language parsing.

Examples:

* "2 eggs and toast"
* "banana"
* "my usual breakfast"
* "ran 4km in 30 minutes"

Only use a more capable model when:

* the meal is genuinely ambiguous
* database resolution fails
* nutritional estimation is required
* the description represents a complex prepared meal

Do not send unnecessary conversation history with every request.

Provide only relevant context such as:

* current request
* likely matching saved foods
* likely matching saved meals
* necessary user preferences

Cache/reuse confirmed foods whenever possible.

---

# 10. Saved Foods

Allow foods to be stored in the user's personal database.

Examples:

* usual yoghurt
* preferred bread
* particular cereal
* coffee preparation
* homemade granola

A saved food should contain:

* name
* aliases
* normal serving size
* nutritional information
* nutrition source
* optional external database ID
* optional brand

The application should prioritise saved foods during future interpretation.

---

# 11. Saved Meals

Allow combinations of foods to be stored as meals.

Examples:

* usual breakfast
* porridge
* toast breakfast
* dhal and rice
* usual salad

A saved meal contains multiple foods and quantities.

The conversational system should support modifications.

Example:

> "Usual breakfast but strawberries instead of banana."

The system should retrieve the saved meal and modify the relevant component before presenting it for confirmation.

---

# 12. Recipes

Recipes may be introduced after basic saved meals work.

A recipe contains known ingredients and quantities.

Nutrition should be calculated from those ingredients and stored as:

`calculated`

Allow a recipe to define:

* total recipe quantity or servings
* ingredients
* nutritional total
* nutrition per serving

---

# 13. Added Sugar

Added sugar requires special handling.

The user normally consumes little added sugar and can explicitly report it when relevant.

Do not infer added sugar merely from the "sugars" field on European nutrition labels.

Allow conversational statements such as:

> "There was about 5g added sugar."

or

> "Add 1 teaspoon honey."

Where the amount of added sugar is reliably known from an ingredient, it may be calculated.

Otherwise use:

* known value
* explicit user value
* unknown

Do not fabricate precision.

---

# 14. Exercise

MVP exercise logging is conversational/manual.

Example:

> "Ran 4.2 km in 30 minutes."

Parse into:

```json
{
  "type": "running",
  "distance_km": 4.2,
  "duration_minutes": 30
}
```

Calculate estimated calorie expenditure deterministically using:

* activity
* current body weight
* distance and/or duration

Store the estimation method.

Display exercise calories separately from food calories.

Provide a setting:

`Eat back exercise calories`

Options:

* 0%
* 50%
* 100%

Default should be conservative.

Do NOT integrate Apple Health, Strava or other fitness platforms in MVP.

These can be future features.

---

# 15. Weight Tracking

Allow the user to record body weight quickly.

Store:

* date/time
* weight
* optional note

The dashboard should avoid over-emphasising individual measurements.

Calculate:

* latest weight
* 7-day moving average when sufficient data exists
* 30-day trend when sufficient data exists
* longer-term history

Provide a simple weight graph.

The system should focus on trends rather than daily fluctuations.

---

# 16. Feedback Loop

The application should eventually help evaluate whether the calorie target is producing the intended weight trend.

Conceptually:

calorie target
↓
2–3 weeks of intake/weight data
↓
weight trend
↓
possible small target adjustment

Do NOT automatically change the target.

Instead, future versions may suggest an adjustment that the user must approve.

This is NOT required for MVP.

---

# 17. Suggested Database Schema

## profiles

* id
* user_id
* birth_date
* sex
* height_cm
* current_weight_kg
* activity_level
* goal
* calorie_target
* protein_target_g
* carbohydrate_target_g
* fat_target_g
* saturated_fat_limit_g
* fibre_target_g
* added_sugar_limit_g
* exercise_eat_back_percentage
* created_at
* updated_at

## foods

* id
* user_id nullable
* name
* brand nullable
* aliases
* source
* external_source_id nullable
* serving_quantity
* serving_unit
* calories
* protein_g
* carbohydrate_g
* fat_g
* saturated_fat_g
* fibre_g
* total_sugars_g nullable
* added_sugar_g nullable
* created_at
* updated_at

## reference_foods

Imported food composition rows available to all authenticated users.

These records are separate from personal `foods` so that public/reference datasets remain read-only and traceable. Selecting a reference food should copy the relevant values into the user's personal `foods` table before logging.

* id
* source
* source_food_id
* source_version
* name
* brand nullable
* category nullable
* locale nullable
* serving_quantity
* serving_unit
* calories
* protein_g
* carbohydrate_g
* fat_g
* saturated_fat_g nullable
* fibre_g nullable
* total_sugars_g nullable
* added_sugar_g nullable
* salt_g nullable
* raw_data nullable
* created_at
* updated_at

Recommended initial sources:

* `portfir_bdca` — use the current INSA BDCA workbook. The local file `data/insa_tca.xlsx` identifies as `v 7.1 - 2026`, updated `03-03-2026`.
* `cofid_uk` — use McCance and Widdowson / CoFID 2021 if included.

Reference importers must preserve unknown nutrient values as null. Trace values may be normalised to zero only when the source explicitly marks the nutrient as trace.

## food_logs

* id
* user_id
* logged_at
* meal_type
* food_id nullable
* display_name
* quantity
* unit
* calories
* protein_g
* carbohydrate_g
* fat_g
* saturated_fat_g
* fibre_g
* added_sugar_g nullable
* nutrition_source
* original_user_text nullable
* created_at

Nutrition values should be copied into the log at the time of logging.

Historical entries must NOT change if the source food record is later modified.

## saved_meals

* id
* user_id
* name
* aliases
* created_at
* updated_at

## saved_meal_items

* id
* saved_meal_id
* food_id
* quantity
* unit

## exercise_logs

* id
* user_id
* logged_at
* type
* duration_minutes nullable
* distance_km nullable
* calories_estimated
* estimation_method
* original_user_text nullable
* created_at

## weight_logs

* id
* user_id
* logged_at
* weight_kg
* note nullable
* created_at

---

# 18. Security

API keys must never be exposed in browser/client code.

Store secrets in environment variables.

External API and LLM requests requiring secret credentials should execute server-side.

Use Supabase Row Level Security where appropriate.

Users should only be able to access their own:

* profile
* foods
* meals
* logs
* exercise
* weight history

---

# 19. PWA

The application should eventually be installable on an iPhone home screen.

Requirements:

* appropriate manifest
* app icon
* mobile viewport
* standalone-friendly interface

Do not allow PWA configuration to delay the basic application.

---

# 20. Error Handling

The application must degrade gracefully.

If an external food database is unavailable:

* saved foods should still work
* user should be able to enter nutrition manually
* the app should explain that lookup failed

If the LLM API fails:

* existing saved foods should remain usable
* manual logging should remain possible

Never lose a confirmed food log because a later API request fails.

---

# 21. MVP Scope

The MVP should contain:

1. Basic authentication
2. User profile
3. Calorie and macro target calculation
4. Editable nutrition targets
5. Today dashboard
6. Nutrition cylinders
7. Conversational food input
8. Structured food parsing
9. Food confirmation/editing
10. Basic nutrition database lookup
11. Personal saved foods
12. Daily food logs
13. Conversational/manual running logs
14. Exercise adjustment
15. Weight logging
16. Basic weight trend
17. Responsive mobile design

The MVP does NOT require:

* barcode scanning
* Apple Health
* Strava
* image recognition
* meal photographs
* social features
* public profiles
* complex analytics
* automatic calorie-target adjustment
* native iOS/Android applications
* elaborate recipe management

Avoid implementing these prematurely.

---

# 22. Development Phases

## Phase 1 — Foundation

Create:

* Next.js/TypeScript project
* Tailwind setup
* Supabase integration
* authentication
* database schema/migrations
* mobile application shell
* environment variable configuration
* basic README

No LLM integration yet.

## Phase 2 — Profile and Targets

Implement:

* onboarding
* profile
* deterministic BMR/TDEE calculation
* nutrition targets
* settings/editing

Add unit tests for calculation functions.

## Phase 3 — Dashboard

Implement:

* Today page
* nutrition cylinders
* empty daily state
* daily totals
* responsive mobile UI

Use mock data initially if necessary.

## Phase 4 — Manual Food Logging

Implement:

* food records
* manual food creation
* food logs
* meal types
* daily totals
* recent foods
* editing/deleting logs

At the end of this phase the application should already function as a basic nutrition tracker without AI.

## Phase 5 — External Food Resolution

Implement:

* USDA FoodData Central integration
* Open Food Facts integration where useful
* Supabase reference food lookup from imported PortFIR / INSA BDCA data
* optional Supabase reference food lookup from imported McCance and Widdowson / CoFID data
* food search/resolution
* caching confirmed foods into personal database
* import scripts for reference datasets that can be run locally without committing generated secrets

Do not expose API credentials client-side.

## Phase 6 — Conversational Food Logging

Implement:

* natural-language input
* structured LLM output
* food extraction
* quantity interpretation
* matching against personal foods
* matching against external sources
* confirmation UI

Use the inexpensive model first.

## Phase 7 — Intelligent Fallback

Implement:

* ambiguity detection
* unresolved meal detection
* stronger-model fallback
* nutritional estimation
* `estimated` provenance
* user confirmation/editing
* option to save confirmed result as reusable meal

## Phase 8 — Saved Meals

Implement:

* saved meal creation
* aliases
* conversational retrieval
* meal modification

Example:

> "Usual breakfast but no walnuts."

## Phase 9 — Exercise

Implement:

* conversational running input
* deterministic calorie estimate
* exercise logs
* eat-back setting
* dashboard adjustment

## Phase 10 — Weight

Implement:

* quick weight logging
* history
* moving average
* trend
* simple graph

## Phase 11 — PWA and Polish

Implement:

* PWA manifest
* icons
* home-screen behaviour
* loading states
* empty states
* error states
* accessibility review
* final mobile UX refinement

---

# 23. Testing

Prioritise tests for deterministic business logic.

At minimum test:

* BMR calculation
* TDEE calculation
* calorie target calculation
* macro calculations
* nutrient aggregation
* quantity conversion
* exercise calorie calculations
* exercise eat-back calculation
* weight moving averages

Validate LLM responses against strict schemas.

Never trust arbitrary model output.

---

# 24. Code Quality

Prefer:

* small functions
* typed interfaces
* clear separation between UI, business logic and external services
* server-side API wrappers
* reusable components
* straightforward code over clever abstractions

Avoid premature abstraction.

Do not add dependencies unless they provide clear value.

Do not implement functionality outside the current development phase unless necessary for architecture.

---

# 25. UX Priority

When choosing between sophistication and speed of logging, favour speed.

The expected everyday workflow should eventually be approximately:

1. Open app.
2. See today's nutrition.
3. Type or dictate what was eaten.
4. Check interpretation.
5. Tap confirm.
6. Dashboard updates.

A common meal should ideally take only a few seconds to log.

The application should become faster to use as the personal food database grows.

---

# 26. Future Features

Possible future work, but explicitly outside the initial MVP:

* barcode scanning
* nutrition-label image extraction
* meal photograph estimation
* Apple Health integration
* recipe import
* automatic recurring meal detection
* weekly nutrition summaries
* LLM-generated insights
* target-adjustment recommendations
* micronutrient analysis
* offline support

Do not build these until the core application is stable and being used regularly.

---

# 27. Definition of Success

The project succeeds when the user can install/open it on an iPhone and, in a few seconds, record something like:

> "Lunch was pumpkin and spinach soup, a slice of sourdough and two scrambled eggs."

The application should:

1. understand the foods,
2. resolve or estimate their nutrition,
3. clearly indicate uncertainty,
4. allow quick correction,
5. save the confirmed entry,
6. update today's calories and nutrient cylinders,
7. remember useful foods/meals for future logging.

The application should prioritise consistency, transparency and ease of use over false nutritional precision.
