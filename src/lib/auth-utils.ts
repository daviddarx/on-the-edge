import { auth } from "@/lib/auth"

/**
 * Checks if the current request is from the owner.
 * Use in API route handlers to gate write operations.
 */
export async function requireOwner() {
  const session = await auth()
  if (!session?.isOwner) {
    return null
  }
  return session
}
