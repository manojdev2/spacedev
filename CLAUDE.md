# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on http://localhost:8080
npm run build        # Production build to dist/
npm run build:dev    # Development build
npm run lint         # ESLint checks
npm run preview      # Preview production build
npm run test         # Run Vitest tests once
npm run test:watch   # Run tests in watch mode
```

## Architecture

LocatePro is an AI-powered store locator SaaS platform. The frontend is React 18 + TypeScript + Vite, backed by Supabase (PostgreSQL + Edge Functions).

### Path Alias

`@/*` maps to `src/*` — use this for all imports.

### State Management Layers

Three distinct layers that should not be confused:
- **Zustand** (`src/store/`) — client-only auth and location state
- **React Query** (`@tanstack/react-query`) — all server state (locations, appointments, reviews, etc.). Custom hooks in `src/hooks/` wrap React Query and are the primary way to interact with Supabase data.
- **React Context** (`src/contexts/`) — Google Maps API key and provider

### Routing Structure

Routes are defined in `src/App.tsx`. Three categories:
- **Public** (`/`, `/locator`, `/location/:id`, `/pricing`, `/blog`, etc.) — wrapped in `MainLayout`
- **Auth** (`/login`, `/signup`, `/setup`, `/forgot-password`) — no layout
- **Protected dashboard** (`/dashboard/*`) — wrapped in `ProtectedRoute` + `DashboardLayout`; the `/embed` route is a standalone embeddable widget

### Multi-Tenant Backend

All core Supabase tables use Row-Level Security for organization-level isolation. The `organizations` table is the tenant root. `user_roles` maps users to orgs with `admin`/`staff` roles.

### Edge Functions

Located in `supabase/functions/`. Each function is a Deno module. Key functions:
- `ai-smart-search` — AI-powered location search
- `scrape-store-locations` — web scraping with AI extraction
- `analyze-coverage` — coverage heatmap analysis
- `create-checkout-session` / `create-paypal-checkout` / `create-coinbase-checkout` — payment flows
- `get-store-recommendations` — AI recommendations

### UI Components

`src/components/ui/` contains Shadcn/UI primitives built on Radix UI. Do not modify these files directly — treat them as a component library. Feature components live in subdirectories: `locator/`, `dashboard/`, `auth/`, `settings/`, `payments/`.

### Supabase Client

Single client instance at `src/integrations/supabase/client.ts`. Generated TypeScript types at `src/integrations/supabase/types.ts` — regenerate with `npx supabase gen types typescript` after schema changes.

### Environment Variables

Required in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Google Maps API key is managed through the app's settings UI and stored in Supabase, not in `.env`.
