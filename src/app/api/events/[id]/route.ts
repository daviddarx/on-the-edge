import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { requireOwner } from "@/lib/auth-utils"
import { getEvents, saveEvents, withRetry } from "@/lib/github"
import { CATEGORIES } from "@/lib/types"

// PUT /api/events/[id] — Owner only, updates an event
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  // Validate provided numeric fields
  if (body.year !== undefined) {
    if (typeof body.year !== "number" || !Number.isFinite(body.year)) {
      return NextResponse.json(
        { error: "Field 'year' must be a finite number" },
        { status: 400 }
      )
    }
    if (body.year < -9999 || body.year > 9999) {
      return NextResponse.json(
        { error: "Year must be between -9999 and 9999" },
        { status: 400 }
      )
    }
  }
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
  // Validate provided string lengths
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0 || body.name.length > 500) {
      return NextResponse.json(
        { error: "Name must be a non-empty string of 500 characters or fewer" },
        { status: 400 }
      )
    }
  }
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
      return NextResponse.json(
        { error: "Region must be 200 characters or fewer" },
        { status: 400 }
      )
    }
  }

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
  const session = await requireOwner()
  if (!session) {
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
