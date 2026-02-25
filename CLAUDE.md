# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**On the Edge** — a simple timeline viewer for major dates in human history. Vibecoded with Claude.

## Status

Scaffolding defined in `specs/`. Implementation not yet started. Update this section as phases are completed.

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router, `src/` directory layout |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui — Default style, Neutral base color |
| Auth | NextAuth.js v5 (`next-auth@beta`) — GitHub OAuth only |
| Database | GitHub-as-DB: `data/events.json` read/written via GitHub Contents API |
| Icons | lucide-react |
| Deployment | Netlify + `@netlify/plugin-nextjs` |
| Package manager | **npm** — never use bun, pnpm, or yarn |

## Key File Paths

```
auth.ts                                    # NextAuth v5 config — lives at project ROOT (not in src/)
netlify.toml                               # Netlify build config
data/events.json                           # The database — must stay committed to the repo
src/
  app/
    layout.tsx                             # Root layout — wraps children with <Providers>
    page.tsx                               # Server Component — fetches data + auth, passes to TimelineApp
    api/
      auth/[...nextauth]/route.ts          # NextAuth OAuth catch-all handler
      events/route.ts                      # GET (public) + POST (owner only)
      events/[id]/route.ts                 # PUT + DELETE (owner only)
  components/
    ui/                                    # shadcn/ui components (owned source files, not node_modules)
    Providers.tsx                          # SessionProvider + TooltipProvider (client wrapper)
    TimelineApp.tsx                        # Client orchestrator — single owner of all mutable state
    Header.tsx / TimelineControls.tsx / CategoryLegend.tsx
    Timeline.tsx / TimelineEntry.tsx
    EventFormModal.tsx / DeleteConfirmDialog.tsx
  lib/
    auth.ts                                # Re-export barrel: `export { auth, signIn, signOut } from "../../auth"`
    auth-utils.ts                          # requireOwner() helper for API routes
    github.ts                              # GitHub Contents API service (getEvents, saveEvents, withRetry)
    types.ts                               # TimelineEvent, Category, CATEGORIES, EventsData
    format-year.ts                         # formatYear(), formatYearRange()
    utils.ts                               # cn() utility (from shadcn init)
  types/
    next-auth.d.ts                         # Augments Session with username + isOwner
```

## Architecture

`page.tsx` (Server Component) fetches events via `getEvents()` and the session via `auth()`, then passes both as props to `<TimelineApp>` (the client boundary). All mutations go through the `/api/events` REST routes, which call the GitHub Contents API and bust the ISR cache via `revalidateTag("events")`. Client components read session state via `useSession()` from `next-auth/react`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `AUTH_GITHUB_ID` | GitHub OAuth App Client ID (auto-read by NextAuth v5) |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret (auto-read by NextAuth v5) |
| `AUTH_SECRET` | Signs/encrypts JWT tokens — generate with `npx auth secret` |
| `GITHUB_OWNER` | GitHub username — whitelist for write access + repo owner for Contents API |
| `GITHUB_REPO` | Repository name (e.g. `on-the-edge`) |
| `GITHUB_TOKEN` | Personal Access Token with `repo` scope — for reading/writing `data/events.json` |

Set in `.env.local` for local dev (git-ignored). Set in Netlify dashboard → Site Settings → Environment Variables for production.

## Critical Rules

### Tailwind: never use dynamic class construction
`CATEGORIES` in `src/lib/types.ts` stores static Tailwind class strings (`bg-blue-500`, `text-blue-500`, etc.). Tailwind's JIT scanner detects these at build time only if they are complete, static string literals.

```typescript
// CORRECT — Tailwind detects this
cat.dotClass  // "bg-blue-500"

// WRONG — Tailwind will NOT detect this, class won't be generated
`bg-${color}-500`
```

### Next.js 15: always await `params` in route handlers
In Next.js 15, `params` in route handlers is a `Promise` and must be awaited.

```typescript
// CORRECT
const { id } = await params

// WRONG — breaks in Next.js 15
const { id } = params
```

### GitHub API calls are server-side only
`Buffer.from()`, `next: { tags, revalidate }` on fetch, and `revalidateTag()` are Node.js/Next.js server APIs. Never import or call `src/lib/github.ts` from a Client Component (`"use client"`).

### Always put `getEvents()` inside `withRetry()`
The retry callback must include the read so each attempt gets a fresh SHA. Putting `getEvents()` outside means retries reuse a stale SHA and will always fail on conflict.

```typescript
// CORRECT — fresh SHA on every attempt
await withRetry(async () => {
  const { data, sha } = await getEvents()
  data.events.push(newEvent)
  return await saveEvents(data, sha, "Add event")
})

// WRONG — stale SHA on retries
const { data, sha } = await getEvents()
await withRetry(async () => saveEvents(data, sha, "Add event"))
```

### Always call `revalidateTag("events")` after writes
Without this, the ISR cache serves stale data for up to 3600 seconds after a mutation.

### `TimelineApp.tsx` is the single state owner
All mutable state (`events`, `categoryFilter`, `searchQuery`, `formModal`, `deleteDialog`) lives in `TimelineApp.tsx` and is passed down via props. Do not add local state to child components for concerns that belong to the orchestrator.

### Minimalist design
Implement layouts to position elements correctly. Avoid adding heavy styling, decorative elements, animations, or visual flourishes beyond what the specs describe.

## npm Scripts

```bash
npm run dev    # Start dev server at localhost:3000
npm run build  # Production build
npm run lint   # ESLint
```
