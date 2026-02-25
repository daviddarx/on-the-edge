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
  )
}
