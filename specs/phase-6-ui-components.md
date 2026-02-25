# Phase 6: UI Components, Layout & Client-Side Interactions

## Overview

Build all user-facing components: the page layout, header, timeline controls, category legend, timeline with entries, event form modal, and delete confirmation dialog. Uses a single client orchestrator pattern — `TimelineApp.tsx` owns all mutable state and passes it down via props.

## Dependencies

- Phase 1 complete (shadcn/ui components available, lucide-react installed)
- Phase 2 complete (types, categories, format-year utilities)
- Phase 3 complete (auth, Providers wrapper, layout with SessionProvider)
- Phase 4 complete (getEvents() for server-side data fetching)
- Phase 5 complete (API routes for CRUD operations)

---

## Component Tree

```
page.tsx (Server Component)
  └─ <main className="mx-auto max-w-[800px] px-5 py-8">
       └─ <TimelineApp events={events} isOwner={bool}>
            ├─ <Header />
            ├─ <TimelineControls />
            ├─ <CategoryLegend />
            ├─ <Timeline>
            │    └─ <TimelineEntry /> (×N)
            ├─ <EventFormModal />
            └─ <DeleteConfirmDialog />
```

---

## Task 6.1: Server Component Entry Point

**File: `src/app/page.tsx`**

```typescript
import { getEvents } from "@/lib/github"
import { auth } from "@/lib/auth"
import { TimelineApp } from "@/components/TimelineApp"

export default async function Home() {
  const { data } = await getEvents()
  const session = await auth()

  return (
    <main className="mx-auto max-w-[800px] px-5 py-8">
      <TimelineApp
        events={data.events}
        isOwner={session?.isOwner ?? false}
      />
    </main>
  )
}
```

**Key decisions:**
- Server Component — fetches data and auth state server-side, passes to client boundary.
- `max-w-[800px] mx-auto px-5` handles responsive behavior. No media queries needed — the layout stacks vertically at all sizes with a max-width cap.
- `py-8` provides vertical breathing room.

---

## Task 6.2: Client Orchestrator

**File: `src/components/TimelineApp.tsx`**

```typescript
"use client"

import { useState, useMemo } from "react"
import { TimelineEvent, Category } from "@/lib/types"
import { Header } from "@/components/Header"
import { TimelineControls } from "@/components/TimelineControls"
import { CategoryLegend } from "@/components/CategoryLegend"
import { Timeline } from "@/components/Timeline"
import { EventFormModal } from "@/components/EventFormModal"
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog"

interface TimelineAppProps {
  events: TimelineEvent[]
  isOwner: boolean
}

export function TimelineApp({ events: initialEvents, isOwner }: TimelineAppProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents)
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [formModal, setFormModal] = useState<{
    open: boolean
    editingEvent?: TimelineEvent
  }>({ open: false })
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    event?: TimelineEvent
  }>({ open: false })

  // Filtered + sorted events (computed)
  const filteredEvents = useMemo(() => {
    let result = events

    if (categoryFilter !== "all") {
      result = result.filter(e => e.category === categoryFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.region && e.region.toLowerCase().includes(q))
      )
    }

    // Sort newest first (highest year at top)
    return [...result].sort((a, b) => b.year - a.year)
  }, [events, categoryFilter, searchQuery])

  // --- Mutation handlers ---

  async function handleAddEvent(data: Omit<TimelineEvent, "id">) {
    const tempId = crypto.randomUUID()
    const optimisticEvent: TimelineEvent = { ...data, id: tempId }

    setEvents(prev => [...prev, optimisticEvent])

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create")
      const savedEvent = await res.json()
      setEvents(prev => prev.map(e => e.id === tempId ? savedEvent : e))
    } catch {
      setEvents(prev => prev.filter(e => e.id !== tempId))
    }
  }

  async function handleEditEvent(id: string, data: Partial<TimelineEvent>) {
    const original = events.find(e => e.id === id)
    if (!original) return

    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))

    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update")
      const updated = await res.json()
      setEvents(prev => prev.map(e => e.id === id ? updated : e))
    } catch {
      setEvents(prev => prev.map(e => e.id === id ? original : e))
    }
  }

  async function handleDeleteEvent(id: string) {
    const original = events.find(e => e.id === id)
    if (!original) return

    setEvents(prev => prev.filter(e => e.id !== id))

    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
    } catch {
      setEvents(prev => [...prev, original])
    }
  }

  return (
    <>
      <Header />
      <TimelineControls
        isOwner={isOwner}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddNew={() => setFormModal({ open: true })}
      />
      <CategoryLegend visible={categoryFilter === "all"} />
      <Timeline
        events={filteredEvents}
        isOwner={isOwner}
        onEdit={(event) => setFormModal({ open: true, editingEvent: event })}
        onDelete={(event) => setDeleteDialog({ open: true, event })}
      />
      <EventFormModal
        open={formModal.open}
        onClose={() => setFormModal({ open: false })}
        onSubmit={async (data) => {
          if (formModal.editingEvent) {
            await handleEditEvent(formModal.editingEvent.id, data)
          } else {
            await handleAddEvent(data as Omit<TimelineEvent, "id">)
          }
          setFormModal({ open: false })
        }}
        initialData={formModal.editingEvent}
      />
      <DeleteConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false })}
        onConfirm={async () => {
          if (deleteDialog.event) {
            await handleDeleteEvent(deleteDialog.event.id)
          }
          setDeleteDialog({ open: false })
        }}
        eventName={deleteDialog.event?.name ?? ""}
      />
    </>
  )
}
```

### State Management

| State | Type | Default | Purpose |
|---|---|---|---|
| `events` | `TimelineEvent[]` | from server props | Mutable copy for optimistic updates |
| `categoryFilter` | `Category \| "all"` | `"all"` | Active category filter |
| `searchQuery` | `string` | `""` | Search input value |
| `formModal` | `{ open, editingEvent? }` | `{ open: false }` | Controls add/edit modal |
| `deleteDialog` | `{ open, event? }` | `{ open: false }` | Controls delete confirmation |

### Optimistic Updates Pattern

- **Add**: Insert with temp UUID → replace with server response on success → remove on failure
- **Edit**: Replace in-place → update with server response on success → revert to original on failure
- **Delete**: Remove immediately → re-insert on failure

---

## Task 6.3: Header

**File: `src/components/Header.tsx`**

```typescript
"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function Header() {
  const { data: session, status } = useSession()

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold">On the edge</h1>
        <p className="mt-1 text-muted-foreground">
          Simple timeline viewer for major dates in human history.
        </p>
      </div>
      {status === "loading" ? (
        <Button variant="outline" size="sm" disabled>...</Button>
      ) : session ? (
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          Logout
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => signIn("github")}>
          Login
        </Button>
      )}
    </div>
  )
}
```

Uses `useSession()` from `next-auth/react` for client-side login/logout. The `signIn("github")` call triggers the OAuth flow.

---

## Task 6.4: Timeline Controls

**File: `src/components/TimelineControls.tsx`**

```typescript
"use client"

import { Category, CATEGORIES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimelineControlsProps {
  isOwner: boolean
  categoryFilter: Category | "all"
  onCategoryChange: (value: Category | "all") => void
  searchQuery: string
  onSearchChange: (value: string) => void
  onAddNew: () => void
}

export function TimelineControls({
  isOwner,
  categoryFilter,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  onAddNew,
}: TimelineControlsProps) {
  return (
    <div className="mt-6 space-y-3">
      {isOwner && (
        <Button onClick={onAddNew}>Add a new date</Button>
      )}
      <Select
        value={categoryFilter}
        onValueChange={(v) => onCategoryChange(v as Category | "all")}
      >
        <SelectTrigger>
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              <span className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${cat.dotClass}`}
                />
                {cat.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="Search by name or region..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  )
}
```

Each category option shows its colored dot inline. The select defaults to "All categories".

---

## Task 6.5: Category Legend

**File: `src/components/CategoryLegend.tsx`**

```typescript
"use client"

import { CATEGORIES } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CategoryLegendProps {
  visible: boolean
}

export function CategoryLegend({ visible }: CategoryLegendProps) {
  if (!visible) return null

  return (
    <div className="sticky top-0 z-10 mt-4 flex flex-wrap gap-4 border-b bg-background py-3">
      {CATEGORIES.map((cat) => (
        <div key={cat.value} className="flex items-center gap-1.5 text-sm">
          <span className={cn("h-2.5 w-2.5 rounded-full", cat.dotClass)} />
          <span>{cat.label}</span>
        </div>
      ))}
    </div>
  )
}
```

**Key details:**
- Only rendered when "All categories" is selected (`visible` prop)
- `sticky top-0 z-10` makes it stick when scrolling the timeline
- `bg-background` ensures opaque background (from shadcn theme) so timeline content doesn't bleed through
- `border-b` provides visual separation

---

## Task 6.6: Timeline and TimelineEntry

**File: `src/components/Timeline.tsx`**

```typescript
"use client"

import { TimelineEvent } from "@/lib/types"
import { TimelineEntry } from "@/components/TimelineEntry"

interface TimelineProps {
  events: TimelineEvent[]
  isOwner: boolean
  onEdit: (event: TimelineEvent) => void
  onDelete: (event: TimelineEvent) => void
}

export function Timeline({ events, isOwner, onEdit, onDelete }: TimelineProps) {
  if (events.length === 0) {
    return (
      <p className="mt-8 text-center text-muted-foreground">
        No events found.
      </p>
    )
  }

  return (
    <div className="relative mt-4 ml-3 border-l-2 border-muted">
      {events.map((event) => (
        <TimelineEntry
          key={event.id}
          event={event}
          isOwner={isOwner}
          onEdit={() => onEdit(event)}
          onDelete={() => onDelete(event)}
        />
      ))}
    </div>
  )
}
```

**File: `src/components/TimelineEntry.tsx`**

```typescript
"use client"

import { TimelineEvent, CATEGORIES } from "@/lib/types"
import { formatYearRange } from "@/lib/format-year"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Pencil, Trash2 } from "lucide-react"

interface TimelineEntryProps {
  event: TimelineEvent
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
}

export function TimelineEntry({ event, isOwner, onEdit, onDelete }: TimelineEntryProps) {
  const category = CATEGORIES.find(c => c.value === event.category)

  const content = (
    <span className="text-sm">
      <span className="font-medium">
        {formatYearRange(event.year, event.endYear)}
      </span>
      {": "}
      {event.name}
      {event.region && (
        <span className="text-muted-foreground"> ({event.region})</span>
      )}
    </span>
  )

  return (
    <div className="group relative py-2 pl-6">
      {/* Colored dot */}
      <span
        className={cn(
          "absolute left-[-5px] top-[14px] h-2.5 w-2.5 rounded-full",
          category?.dotClass
        )}
      />

      {/* Content with optional tooltip */}
      <div className="flex items-baseline gap-2">
        {event.description ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{content}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{event.description}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          content
        )}

        {/* Edit/Delete icons — visible on hover when authenticated */}
        {isOwner && (
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Key details:**
- Dot is absolutely positioned at `left-[-5px]` to overlap the `border-l-2` line
- Tooltip only wraps entries with a description (conditional rendering avoids empty tooltips)
- Edit/delete icons use `group-hover:opacity-100` — CSS-only, no state needed
- On mobile/touch, hover icons won't appear — a known trade-off for minimalist design
- `cursor-help` on tooltip-enabled entries provides visual hint

---

## Task 6.7: Event Form Modal

**File: `src/components/EventFormModal.tsx`**

```typescript
"use client"

import { useState, useEffect } from "react"
import { TimelineEvent, Category, CATEGORIES } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EventFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Partial<TimelineEvent>) => Promise<void>
  initialData?: TimelineEvent
}

export function EventFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
}: EventFormModalProps) {
  const [year, setYear] = useState("")
  const [name, setName] = useState("")
  const [category, setCategory] = useState<Category | "">("")
  const [endYear, setEndYear] = useState("")
  const [region, setRegion] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (open && initialData) {
      setYear(String(initialData.year))
      setName(initialData.name)
      setCategory(initialData.category)
      setEndYear(initialData.endYear != null ? String(initialData.endYear) : "")
      setRegion(initialData.region ?? "")
      setDescription(initialData.description ?? "")
    } else if (open) {
      setYear("")
      setName("")
      setCategory("")
      setEndYear("")
      setRegion("")
      setDescription("")
    }
  }, [open, initialData])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!year || !name || !category) return

    setLoading(true)
    try {
      await onSubmit({
        year: Number(year),
        name,
        category: category as Category,
        endYear: endYear ? Number(endYear) : null,
        region: region || null,
        description: description || null,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit date" : "Add a new date"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="year">Year *</Label>
            <Input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 1969 or -44 for BC"
              required
            />
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Moon landing"
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as Category)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${cat.dotClass}`} />
                      {cat.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="endYear">End Year</Label>
            <Input
              id="endYear"
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label htmlFor="region">Region</Label>
            <Input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Europe"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shown as tooltip on hover"
            />
          </div>
          <Button type="submit" disabled={loading || !year || !name || !category}>
            {loading ? "Saving..." : initialData ? "Save" : "Add"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Key details:**
- Dual-purpose: add (no initialData) and edit (with initialData)
- `useEffect` resets form when modal opens — clears for add, populates for edit
- Year input is `type="number"` — supports negative values for BC dates
- Submit button disabled when loading or required fields empty
- Empty optional fields converted to `null` before submission

---

## Task 6.8: Delete Confirmation Dialog

**File: `src/components/DeleteConfirmDialog.tsx`**

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface DeleteConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  eventName: string
}

export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  eventName,
}: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete entry</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{eventName}&rdquo;? This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Files Created/Modified

| File | Action | Purpose |
|---|---|---|
| `src/app/page.tsx` | Replace | Server component entry point |
| `src/components/TimelineApp.tsx` | Create | Client orchestrator (all state) |
| `src/components/Header.tsx` | Create | Title, lead, login/logout button |
| `src/components/TimelineControls.tsx` | Create | Add button, category filter, search |
| `src/components/CategoryLegend.tsx` | Create | Sticky category legend bar |
| `src/components/Timeline.tsx` | Create | Timeline container |
| `src/components/TimelineEntry.tsx` | Create | Individual entry with colored dot |
| `src/components/EventFormModal.tsx` | Create | Add/edit dialog form |
| `src/components/DeleteConfirmDialog.tsx` | Create | Delete confirmation |

## Verification Checklist

- [ ] Page loads at localhost:3000 showing seed events sorted newest-first
- [ ] Each event displays with correct colored dot
- [ ] Category filter shows "All categories" by default
- [ ] Filtering by category shows only matching events
- [ ] Sticky legend bar appears when "All categories" selected, disappears otherwise
- [ ] Search bar filters by name and region in real-time
- [ ] Login/logout button works
- [ ] "Add a new date" button visible only when logged in as owner
- [ ] Add modal opens with empty fields, creates event on submit
- [ ] Edit modal opens with pre-filled fields, updates event on submit
- [ ] Hover reveals edit/delete icons on entries (when owner)
- [ ] Delete confirmation dialog appears, deletes on confirm
- [ ] Tooltips appear on hover for entries with descriptions
- [ ] BC dates (negative years) display correctly (e.g., "3000 BC")
- [ ] Year ranges display correctly (e.g., "1939-1945")
- [ ] Responsive layout works on mobile (vertical stack, 20px padding)
- [ ] Optimistic updates reflect immediately in the UI
