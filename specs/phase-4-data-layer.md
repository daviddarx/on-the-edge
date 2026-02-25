# Phase 4: GitHub Contents API Data Layer

## Overview

The app uses "GitHub-as-DB" — event data is stored in `data/events.json` in the repository and accessed via the GitHub REST API (Contents endpoint). This phase implements the service layer that reads and writes this file.

## Dependencies

- Phase 1 complete (project scaffolded)
- Phase 2 complete (`TimelineEvent`, `EventsData` types available in `src/lib/types.ts`)
- `.env.local` has `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN`
- `data/events.json` exists in the repo and is committed

---

## Task 4.1: GitHub API Service

**File: `src/lib/github.ts`**

### Constants and Helpers

```typescript
import { EventsData } from "./types"

const GITHUB_API = "https://api.github.com"
const FILE_PATH = "data/events.json"

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  }
}

function getFileUrl(): string {
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  return `${GITHUB_API}/repos/${owner}/${repo}/contents/${FILE_PATH}`
}
```

### `getEvents()` — Read

```typescript
/**
 * Fetches events from the GitHub Contents API.
 * Returns the parsed data AND the file's SHA (needed for writes).
 *
 * Uses Next.js ISR: cached for 1 hour, tagged for on-demand revalidation.
 * After any write operation, call revalidateTag("events") to bust the cache.
 */
export async function getEvents(): Promise<{ data: EventsData; sha: string }> {
  const url = getFileUrl()

  const res = await fetch(url, {
    headers: getHeaders(),
    next: { tags: ["events"], revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  const content = Buffer.from(json.content, "base64").toString("utf-8")
  const data: EventsData = JSON.parse(content)

  return { data, sha: json.sha }
}
```

**How it works:**
1. Makes a GET request to `https://api.github.com/repos/{owner}/{repo}/contents/data/events.json`
2. The response includes `content` (base64-encoded file contents) and `sha` (the file's blob hash)
3. Decodes the base64 content using `Buffer.from(..., "base64")`
4. Parses the JSON string into an `EventsData` object
5. Returns both the data and the SHA

**Why return the SHA?**

The GitHub Contents API requires the current file SHA for any write operation (PUT). This is their optimistic concurrency control — if someone else modified the file since you read it, your SHA won't match and GitHub returns a 409 Conflict.

### `saveEvents()` — Write

```typescript
/**
 * Writes events back to GitHub by updating data/events.json.
 * Requires the current file SHA for concurrency control.
 *
 * @param events - The complete EventsData to write
 * @param sha - The current file SHA (from getEvents())
 * @param message - Git commit message for this change
 * @returns The new file SHA after the write
 * @throws ConflictError if the SHA is stale (409 from GitHub)
 */
export async function saveEvents(
  events: EventsData,
  sha: string,
  message: string
): Promise<{ sha: string }> {
  const url = getFileUrl()
  const content = Buffer.from(
    JSON.stringify(events, null, 2),
    "utf-8"
  ).toString("base64")

  const res = await fetch(url, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({
      message,
      content,
      sha,
    }),
  })

  if (res.status === 409) {
    throw new ConflictError("File was modified concurrently. Please retry.")
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API error: ${res.status} ${body}`)
  }

  const json = await res.json()
  return { sha: json.content.sha }
}
```

**How it works:**
1. Serializes events to pretty-printed JSON (`null, 2` for readability in the repo)
2. Base64-encodes the JSON string
3. Makes a PUT request with `message` (commit message), `content` (base64), and `sha` (current file hash)
4. If successful, GitHub creates a new commit and returns the new file info
5. Returns the new SHA for any subsequent writes

**The SHA dance:**
```
Read  → getEvents() returns { data, sha: "abc123" }
Write → saveEvents(modifiedData, "abc123", "Add event") → returns { sha: "def456" }
Read  → getEvents() returns { data, sha: "def456" }  // new SHA
```

### `ConflictError` Class

```typescript
/**
 * Thrown when a GitHub API write fails due to SHA mismatch (409 Conflict).
 * This means someone else modified the file between our read and write.
 */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConflictError"
  }
}
```

### `withRetry()` — Concurrency-Safe Retry Logic

```typescript
/**
 * Retries an async operation that may fail with ConflictError.
 * The callback should re-read the file (to get a fresh SHA) and
 * re-apply the mutation on each attempt.
 *
 * @param fn - Async function to retry. Should include both read and write.
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (error instanceof ConflictError && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)))
        continue
      }
      throw error
    }
  }
  throw new Error("withRetry: unreachable")
}
```

**Critical usage pattern:**

```typescript
// CORRECT: getEvents() is INSIDE the retry callback
await withRetry(async () => {
  const { data, sha } = await getEvents()  // Fresh read on each attempt
  data.events.push(newEvent)
  return await saveEvents(data, sha, "Add event")
})

// WRONG: getEvents() is OUTSIDE — stale SHA on retry
const { data, sha } = await getEvents()
await withRetry(async () => {
  data.events.push(newEvent)
  return await saveEvents(data, sha, "Add event")  // Same stale SHA!
})
```

The retry callback must include the read operation so each attempt gets a fresh SHA.

**Backoff strategy:** Linear — 200ms, 400ms, 600ms. Sufficient for a single-user app.

---

## Task 4.2: Caching Architecture

### Server-Side: ISR + On-Demand Revalidation

```
Request 1:   GET /api/events → getEvents() → GitHub API → Cache (tagged "events")
Request 2:   GET /api/events → getEvents() → Served from cache (fast)
...
Write:       POST /api/events → saveEvents() → revalidateTag("events") → Cache busted
Request N+1: GET /api/events → getEvents() → GitHub API → Fresh data → Cache
```

**Why ISR over SSR?**
- SSR (`cache: 'no-store'`) would hit GitHub's API on every page load — slow and burns rate limits.
- ISR caches the response and serves it instantly, only re-fetching when stale or explicitly revalidated.

**Why 3600s revalidation?**
- 1 hour balance. If someone edits `data/events.json` directly on GitHub (not through the app), the cache refreshes within an hour.
- The on-demand `revalidateTag("events")` handles immediate refresh after in-app writes.

### Client-Side: Simple Refetch After Mutation

After a successful write, the client re-fetches the events list. No client-side caching library (SWR, React Query) needed.

---

## GitHub API Reference

### Read File
```
GET /repos/{owner}/{repo}/contents/{path}
Headers: Authorization: Bearer {token}, Accept: application/vnd.github.v3+json
Response: { name, path, sha, size, type, encoding, content (base64), ... }
```

### Write File
```
PUT /repos/{owner}/{repo}/contents/{path}
Headers: Authorization: Bearer {token}, Accept: application/vnd.github.v3+json
Body: { message: string, content: base64string, sha: string }
Response: { content: { sha: string, ... }, commit: { ... } }
```

### Rate Limits
- Authenticated: 5,000 requests/hour
- With ISR caching, actual API calls will be minimal

### File Size Limit
- 0–1 MB: Full support (base64 content in response)
- 1–100 MB: Only raw media type supported
- A few hundred events in JSON will be well under 100KB

---

## Files Created

| File | Exports | Purpose |
|---|---|---|
| `src/lib/github.ts` | `getEvents`, `saveEvents`, `ConflictError`, `withRetry` | GitHub Contents API service |

## Potential Issues

1. **ISR on Netlify**: `revalidateTag` requires the Netlify Next.js plugin to support on-demand ISR. The `@netlify/plugin-nextjs` adapter supports this — verify during deployment testing.
2. **`Buffer` availability**: `Buffer.from()` is a Node.js API. Works server-side only (API routes, Server Components). All GitHub API calls must happen server-side.
3. **`next: { tags, revalidate }` on fetch**: Next.js-specific extension to Fetch. Only works server-side. Does NOT work in client-side `fetch` calls.
4. **Stale SHA in rapid writes**: If the owner quickly adds two events, the second write might fail with 409. The `withRetry` pattern handles this by re-reading on each attempt.

## Verification Checklist

- [ ] `getEvents()` returns parsed events from `data/events.json` in the repo
- [ ] `getEvents()` returns the correct SHA
- [ ] `saveEvents()` creates a new commit in the repo
- [ ] `saveEvents()` with a stale SHA throws `ConflictError`
- [ ] `withRetry()` successfully retries after a ConflictError
- [ ] After `saveEvents()`, calling `getEvents()` returns updated data
- [ ] `Buffer.from()` correctly handles base64 encode/decode
