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

    return [...result].sort((a, b) => b.year - a.year)
  }, [events, categoryFilter, searchQuery])

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
