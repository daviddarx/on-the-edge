import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { requireOwner } from "@/lib/auth-utils"
import { getEvents, saveEvents, withRetry } from "@/lib/github"
import { TimelineEvent, CATEGORIES, Category } from "@/lib/types"

// GET /api/events — Public, returns all events
export async function GET() {
  try {
    const { data } = await getEvents()
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/events error:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}

// POST /api/events — Owner only, creates a new event
export async function POST(request: Request) {
  // Auth check
  const session = await requireOwner()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  // Validate required fields and types
  if (typeof body.year !== "number" || !Number.isFinite(body.year)) {
    return NextResponse.json({ error: "Field 'year' must be a finite number" }, { status: 400 })
  }
  if (body.year < -9999 || body.year > 9999) {
    return NextResponse.json({ error: "Year must be between -9999 and 9999" }, { status: 400 })
  }
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json({ error: "Field 'name' is required" }, { status: 400 })
  }
  if (body.name.length > 500) {
    return NextResponse.json({ error: "Name must be 500 characters or fewer" }, { status: 400 })
  }
  if (!body.category) {
    return NextResponse.json({ error: "Field 'category' is required" }, { status: 400 })
  }
  // Validate optional endYear
  if (body.endYear !== undefined && body.endYear !== null) {
    if (typeof body.endYear !== "number" || !Number.isFinite(body.endYear)) {
      return NextResponse.json(
        { error: "Field 'endYear' must be a finite number" },
        { status: 400 }
      )
    }
    if (body.endYear < -9999 || body.endYear > 9999) {
      return NextResponse.json(
        { error: "End year must be between -9999 and 9999" },
        { status: 400 }
      )
    }
  }
  // Validate optional string lengths
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== "string" || body.description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be 2000 characters or fewer" },
        { status: 400 }
      )
    }
  }
  if (body.region !== undefined && body.region !== null) {
    if (typeof body.region !== "string" || body.region.length > 200) {
      return NextResponse.json({ error: "Region must be 200 characters or fewer" }, { status: 400 })
    }
  }

  const validCategories = CATEGORIES.map((c) => c.value)
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

    revalidateTag("events", {})
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("POST /api/events error:", error)
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
}
