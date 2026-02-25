# Phase 3: Authentication (NextAuth.js v5 + GitHub OAuth)

## Overview

Implement GitHub OAuth login using NextAuth.js v5 (Auth.js). The access model is:
- **Public read**: anyone can view the timeline without logging in
- **Owner-only write**: only the GitHub account matching `GITHUB_OWNER` env var can add, edit, or delete entries

The auth system extracts the GitHub username from the OAuth profile and embeds an `isOwner` boolean directly in the session, so client components can conditionally show write UI without exposing the `GITHUB_OWNER` env var to the browser.

## Dependencies

- Phase 1 complete (Next.js scaffolded, `next-auth@beta` installed)
- `.env.local` has `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_SECRET`, `GITHUB_OWNER`

---

## Task 3.1: NextAuth Configuration

**File: `auth.ts`** (project root, NOT inside `src/`)

This is the NextAuth v5 convention — the auth config lives at the project root.

```typescript
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      // NextAuth v5 auto-reads AUTH_GITHUB_ID and AUTH_GITHUB_SECRET
      // from environment variables. No manual clientId/clientSecret needed.

      // Override profile() to capture the GitHub login (username)
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          username: profile.login,  // GitHub username (e.g., "daviddarx")
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // On first sign-in, `user` is populated from profile() return value.
      // Persist the username into the JWT token for subsequent requests.
      if (user) {
        token.username = (user as any).username
      }
      return token
    },
    session({ session, token }) {
      // Forward username from JWT into the session object.
      // Compute isOwner by comparing against GITHUB_OWNER env var.
      if (token.username) {
        session.user.username = token.username as string
      }
      session.isOwner = token.username === process.env.GITHUB_OWNER
      return session
    },
  },
})
```

### Design Decisions

**Why `profile()` callback?**

The GitHub OAuth response contains many fields, but NextAuth's default user mapping only keeps `id`, `name`, `email`, `image`. The GitHub username (`profile.login`) is NOT mapped by default. The `profile()` callback is the only place to extract it.

**Why JWT strategy (no database adapter)?**

No user persistence is needed — we only need the GitHub identity for the owner check. JWT is the default strategy in NextAuth v5 and requires no additional setup. The token is stored as an HTTP-only cookie, which is secure and stateless.

**Why embed `isOwner` in the session?**

Client components need to know if the user is the owner to show/hide write UI (the "Add a new date" button, edit/delete icons). By computing `isOwner` server-side in the session callback, the boolean is available everywhere without exposing the `GITHUB_OWNER` env var to the browser.

**Exported functions:**

| Export | Type | Usage |
|---|---|---|
| `handlers` | `{ GET, POST }` | Used in the catch-all route handler |
| `auth` | `() => Promise<Session \| null>` | Server-side session access (Server Components, Route Handlers) |
| `signIn` | Function | Server-side sign-in trigger |
| `signOut` | Function | Server-side sign-out trigger |

---

## Task 3.2: TypeScript Type Augmentation

**File: `src/types/next-auth.d.ts`**

NextAuth's default types don't include `username` or `isOwner`. We augment them:

```typescript
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      username?: string
    } & DefaultSession["user"]
    isOwner: boolean
  }

  interface User {
    username?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string
  }
}
```

This ensures TypeScript knows about `session.user.username` and `session.isOwner` throughout the codebase.

**Important**: Verify that `tsconfig.json` includes `src/types` in its type resolution. The default `create-next-app` config handles this via `"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"]`.

---

## Task 3.3: Auth Re-export Barrel

**File: `src/lib/auth.ts`**

Since `auth.ts` is at the project root and all source code is in `src/`, importing from `../../auth` is awkward. Create a re-export barrel:

```typescript
export { auth, signIn, signOut, handlers } from "../../auth"
```

Now all imports within `src/` use:
```typescript
import { auth } from "@/lib/auth"
```

---

## Task 3.4: NextAuth Route Handler

**File: `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
```

This catch-all route handles:
- `GET /api/auth/signin` — Sign-in page
- `GET /api/auth/signout` — Sign-out page
- `GET /api/auth/callback/github` — OAuth callback
- `GET /api/auth/session` — Session endpoint (used by `useSession()`)
- `POST /api/auth/signin/github` — Initiate GitHub OAuth flow
- `POST /api/auth/signout` — Process sign-out

---

## Task 3.5: Providers Wrapper Component

**File: `src/components/Providers.tsx`**

```typescript
"use client"

import { SessionProvider } from "next-auth/react"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </SessionProvider>
  )
}
```

This is a client component (required because `SessionProvider` and `TooltipProvider` use React Context).

**Why combine both providers here?**
- `SessionProvider` is needed for `useSession()` in client components (e.g., the login button).
- `TooltipProvider` is required by shadcn's `Tooltip` component (wraps Radix UI's tooltip context).
- Combining them in one wrapper keeps `layout.tsx` clean.

---

## Task 3.6: Update Root Layout

**File: `src/app/layout.tsx`** (modify existing)

```typescript
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/Providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "On the Edge",
  description: "Simple timeline viewer for major dates in human history.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

Key changes from generated default:
- Import and wrap children with `<Providers>`
- Update metadata title and description

---

## Task 3.7: Auth Utility for API Routes

**File: `src/lib/auth-utils.ts`**

```typescript
import { auth } from "@/lib/auth"

/**
 * Checks if the current request is from the owner.
 * Use in API route handlers to gate write operations.
 *
 * Returns the session if the user is the owner, null otherwise.
 */
export async function requireOwner() {
  const session = await auth()
  if (!session?.isOwner) {
    return null
  }
  return session
}
```

Usage in API routes:
```typescript
export async function POST(request: Request) {
  const session = await requireOwner()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // ... proceed with write operation
}
```

---

## Architecture Summary

```
auth.ts (root)                           ← NextAuth v5 config
  ↓ re-exported via
src/lib/auth.ts                          ← Clean import barrel
  ↓ used by
src/lib/auth-utils.ts                    ← requireOwner() for API routes
src/app/api/auth/[...nextauth]/route.ts  ← OAuth route handler
src/components/Providers.tsx             ← SessionProvider wrapper
src/app/layout.tsx                       ← Wraps app with Providers
src/types/next-auth.d.ts                 ← Type augmentation
```

### Data Flow

1. User clicks "Login with GitHub" → `signIn("github")` from `next-auth/react`
2. Redirects to GitHub → user authorizes → GitHub redirects to `/api/auth/callback/github`
3. NextAuth processes the callback, calls `profile()` to extract username
4. `jwt` callback stores username in token
5. `session` callback computes `isOwner` and exposes both in the session
6. Client components read `session.isOwner` via `useSession()` to conditionally render write UI
7. API routes use `requireOwner()` to gate write operations server-side

---

## Files Created/Modified

| File | Action | Purpose |
|---|---|---|
| `auth.ts` | Create | NextAuth v5 config with GitHub provider |
| `src/types/next-auth.d.ts` | Create | Type augmentation for username + isOwner |
| `src/lib/auth.ts` | Create | Re-export barrel for clean imports |
| `src/lib/auth-utils.ts` | Create | requireOwner() utility for API routes |
| `src/app/api/auth/[...nextauth]/route.ts` | Create | OAuth route handler |
| `src/components/Providers.tsx` | Create | SessionProvider + TooltipProvider wrapper |
| `src/app/layout.tsx` | Modify | Wrap children with Providers |

## Potential Issues

1. **GitHub OAuth callback URL mismatch**: The callback URL in the GitHub OAuth App settings MUST exactly match `http://localhost:3000/api/auth/callback/github`. Any mismatch (trailing slash, different port) causes a redirect error.
2. **AUTH_SECRET missing**: NextAuth v5 requires `AUTH_SECRET` in production. In development it auto-generates one, but it's best to set it explicitly.
3. **NextAuth v5 beta instability**: Pin the version after install (`npm ls next-auth` to see version, then pin in package.json) to avoid breaking changes from beta updates.

## Verification Checklist

- [ ] `npm run dev` starts without auth-related errors
- [ ] Navigating to `/api/auth/signin` shows the GitHub sign-in option
- [ ] Clicking "Sign in with GitHub" redirects to GitHub OAuth
- [ ] After authorizing, user is redirected back to the app
- [ ] `useSession()` returns session with `user.username` and `isOwner`
- [ ] Signing out clears the session
- [ ] TypeScript compiles without errors for `session.user.username` and `session.isOwner`
