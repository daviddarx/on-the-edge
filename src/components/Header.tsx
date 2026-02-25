"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  isOwner: boolean
  onAddNew: () => void
}

export function Header({ isOwner, onAddNew }: HeaderProps) {
  const { data: session, status } = useSession()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        {isOwner && (
          <Button size="sm" onClick={onAddNew}>
            Add a new date
          </Button>
        )}
        {status === "loading" ? (
          <Button variant="outline" size="sm" disabled>
            ...
          </Button>
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
      <div>
        <h1 className="text-2xl font-bold">On the edge</h1>
        <p className="text-muted-foreground">
          Simple timeline viewer for major dates in human history.
        </p>
      </div>
    </div>
  )
}
