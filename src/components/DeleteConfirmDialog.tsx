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
          <DialogTitle>Supprimer l&apos;entrée</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer &laquo;&nbsp;{eventName}&nbsp;&raquo;&nbsp;? Cette
            action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "Suppression..." : "Supprimer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
