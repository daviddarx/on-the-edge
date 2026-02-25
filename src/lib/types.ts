export const CATEGORIES = [
  {
    value: "invention",
    label: "Invention",
    color: "#3b82f6",
    dotClass: "bg-blue-500",
    textClass: "text-blue-500",
  },
  {
    value: "event",
    label: "Event",
    color: "#ef4444",
    dotClass: "bg-red-500",
    textClass: "text-red-500",
  },
  {
    value: "person",
    label: "Person",
    color: "#a855f7",
    dotClass: "bg-purple-500",
    textClass: "text-purple-500",
  },
  {
    value: "discovery",
    label: "Discovery",
    color: "#22c55e",
    dotClass: "bg-green-500",
    textClass: "text-green-500",
  },
  {
    value: "civilization",
    label: "Civilization",
    color: "#f59e0b",
    dotClass: "bg-amber-500",
    textClass: "text-amber-500",
  },
] as const

export type Category = (typeof CATEGORIES)[number]["value"]

export interface TimelineEvent {
  id: string
  year: number
  name: string
  category: Category
  endYear?: number | null
  region?: string | null
  description?: string | null
}

export interface EventsData {
  events: TimelineEvent[]
}
