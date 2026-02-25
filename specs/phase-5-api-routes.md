# Phase 5: API Route Handlers

## Overview

Four API endpoints for CRUD operations on timeline events. All write operations are gated behind owner authentication. After every write, the server-side cache is invalidated via `revalidateTag("events")`.

## Dependencies

- Phase 2 complete (`TimelineEvent`, `EventsData`, `Category`, `CATEGORIES` from `src/lib/types.ts`)
- Phase 3 complete (auth setup, `auth()` from `src/lib/auth.ts`)
- Phase 4 complete (`getEvents()`, `saveEvents()`, `withRetry()` from `src/lib/github.ts`)

---

## Endpoints Summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/events` | Public | List all events |
| `POST` | `/api/events` | Owner only | Create a new event |
| `PUT` | `/api/events/[id]` | Owner only | Update an existing event |
| `DELETE` | `/api/events/[id]` | Owner only | Delete an event |

---

## Task 5.1: GET and POST /api/events

**File: `src/app/api/events/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { auth } from "@/lib/auth"
import { getEvents, saveEvents, withRetry } from "@/lib/github"
import { TimelineEvent, CATEGORIES, Category } from "@/lib/types"

// GET /api/events — Public, returns all events
export async function GET() {
  try {
    const { data } = await getEvents()
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/events error:", error)
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    )
  }
}

// POST /api/events — Owner only, creates a new event
export async function POST(request: Request) {
  // Auth check
  const session = await auth()
  if (!session?.isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  // Validation
  if (typeof body.year !== "number" || !body.name || !body.category) {
    return NextResponse.json(
      { error: "Missing required fields: year (number), name, category" },
      { status: 400 }
    )
  }

  const validCategories = CATEGORIES.map(c => c.value)
  if (!validCategories.includes(body.category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
      { status: 400 }
    )
  }

  try {
    const result = await withRetry(async () => {
      const { data, sha } = await getEvents()

      const newEvent: TimelineEvent = {
        id: crypto.randomUUID(),
        year: body.year,
        name: body.name,
        category: body.category as Category,
        endYear: body.endYear ?? null,
        region: body.region ?? null,
        description: body.description ?? null,
      }

      data.events.push(newEvent)

      await saveEvents(data, sha, `Add: ${newEvent.name}`)
      return newEvent
    })

    revalidateTag("events")
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("POST /api/events error:", error)
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    )
  }
}
```

### Request/Response Contracts

**POST /api/events**

Request body:
```json
{
  "year": 1969,
  "name": "Moon landing",
  "category": "event",
  "endYear": null,
  "region": "USA",
  "description": "Apollo 11 — first humans on the Moon."
}
```

| Field | Type | Required | Default |
|---|---|---|---|
| `year` | number | Yes | — |
| `name` | string | Yes | — |
| `category` | Category | Yes | — |
| `endYear` | number \| null | No | `null` |
| `region` | string \| null | No | `null` |
| `description` | string \| null | No | `null` |

Success response (201): The full created event object (including generated `id`).

Error responses:
- `401`: `{ "error": "Unauthorized" }` — not logged in or not the owner
- `400`: `{ "error": "Missing required fields..." }` — validation failure
- `500`: `{ "error": "Failed to create event" }` — GitHub API error

---

## Task 5.2: PUT and DELETE /api/events/[id]

**File: `src/app/api/events/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { auth } from "@/lib/auth"
import { getEvents, saveEvents, withRetry } from "@/lib/github"
import { CATEGORIES } from "@/lib/types"

// PUT /api/events/[id] — Owner only, updates an event
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  // Validate category if provided
  if (body.category) {
    const validCategories = CATEGORIES.map(c => c.value)
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      )
    }
  }

  try {
    const result = await withRetry(async () => {
      const { data, sha } = await getEvents()
      const index = data.events.findIndex((e) => e.id === id)

      if (index === -1) {
        throw new Error("NOT_FOUND")
      }

      // Merge: keep existing fields, overwrite with provided ones.
      // The id field is always preserved (cannot be changed).
      data.events[index] = {
        ...data.events[index],
        ...body,
        id, // Ensure ID cannot be overwritten
      }

      const updated = data.events[index]
      await saveEvents(data, sha, `Update: ${updated.name}`)
      return updated
    })

    revalidateTag("events")
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    console.error(`PUT /api/events/${id} error:`, error)
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id] — Owner only, deletes an event
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.isOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    await withRetry(async () => {
      const { data, sha } = await getEvents()
      const event = data.events.find((e) => e.id === id)

      if (!event) {
        throw new Error("NOT_FOUND")
      }

      data.events = data.events.filter((e) => e.id !== id)
      await saveEvents(data, sha, `Delete: ${event.name}`)
    })

    revalidateTag("events")
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    console.error(`DELETE /api/events/${id} error:`, error)
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    )
  }
}
```

### Request/Response Contracts

**PUT /api/events/[id]** — Partial update (only include fields to change):
```json
{
  "name": "Updated name",
  "year": 1970
}
```

Success response (200): The full updated event object.

**DELETE /api/events/[id]** — No request body needed.

Success response (200): `{ "success": true }`

---

## Important: Next.js 15 `params` is a Promise

In Next.js 15 App Router, the `params` argument in route handlers is a `Promise` and **must be awaited**:

```typescript
// CORRECT (Next.js 15):
const { id } = await params

// WRONG (Next.js 14 style — breaks in 15):
const { id } = params
```

---

## Design Decisions

**Why `auth()` instead of `getServerSession()`?**

NextAuth v5 exports `auth()` directly, which is the recommended way to access the session in App Router. `getServerSession()` is the v4 API.

**Why `NOT_FOUND` as Error message?**

Simple pattern to distinguish "not found" from other errors in the catch block. Used as a sentinel value. For two routes this is adequate — no need for a custom error class.

**Why return the updated event from PUT?**

The client needs server-confirmed data after an edit. Returning the full event lets the client update its local state without a separate GET request.

**Why `revalidateTag("events")` after every write?**

Busts the ISR cache so the next `getEvents()` call fetches fresh data from GitHub. Without this, cached data would be stale for up to 3600 seconds.

**Validation approach:**
- Required fields validated with truthy checks + `typeof` for year
- Category validated against `CATEGORIES` array
- Optional fields default to `null` via `??`
- No validation library (zod, yup) — the API is simple enough for inline validation

---

## File Structure

```
src/app/api/
  events/
    route.ts          # GET + POST /api/events
    [id]/
      route.ts        # PUT + DELETE /api/events/[id]
```

## Files Created

| File | Exports | Purpose |
|---|---|---|
| `src/app/api/events/route.ts` | `GET`, `POST` | List all + create event |
| `src/app/api/events/[id]/route.ts` | `PUT`, `DELETE` | Update + delete event |

## Verification Checklist

- [ ] `GET /api/events` returns seed events from `data/events.json`
- [ ] `POST /api/events` with valid body creates an event (check GitHub for new commit)
- [ ] `POST /api/events` without auth returns 401
- [ ] `POST /api/events` with missing required fields returns 400
- [ ] `POST /api/events` with invalid category returns 400
- [ ] `PUT /api/events/[id]` updates the event in `data/events.json`
- [ ] `PUT /api/events/[id]` with non-existent ID returns 404
- [ ] `DELETE /api/events/[id]` removes the event from `data/events.json`
- [ ] `DELETE /api/events/[id]` with non-existent ID returns 404
- [ ] After each write, cache is busted and GET returns fresh data
- [ ] Rapid consecutive writes succeed (withRetry handles conflicts)

## Testing Tips

- Use `curl` or Insomnia/Postman to test API routes directly.
- For auth-gated routes, sign in via the browser first, then copy the `next-auth.session-token` cookie.
- Check the GitHub repo's commit history after writes to verify the data file was updated correctly.
