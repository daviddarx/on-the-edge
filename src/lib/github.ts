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
