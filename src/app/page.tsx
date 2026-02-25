import { getEvents } from "@/lib/github"
import { auth } from "@/lib/auth"
import { TimelineApp } from "@/components/TimelineApp"

// This page reads live GitHub data and checks the auth session on every request.
// Force dynamic rendering so Next.js never attempts static prerendering.
export const dynamic = "force-dynamic"

export default async function Home() {
  const { data } = await getEvents()
  const session = await auth()

  return (
    <main className="mx-auto max-w-[800px] px-5 py-8">
      <TimelineApp events={data.events} isOwner={session?.isOwner ?? false} />
    </main>
  )
}
