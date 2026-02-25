"use client"

import { useState, useEffect } from "react"
import { TimelineEvent, Category, CATEGORIES } from "@/lib/types"
import { cn } from "@/lib/utils"
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
                      <span className={cn("inline-block h-2.5 w-2.5 rounded-full", cat.dotClass)} />
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
