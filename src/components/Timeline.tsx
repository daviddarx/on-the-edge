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
    return <p className="text-muted-foreground mt-8 text-center">Aucun événement trouvé.</p>
  }

  return (
    <div className="border-muted relative mt-4 ml-1 border-l-2">
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
