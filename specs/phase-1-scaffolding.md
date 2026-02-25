# Phase 1: Project Scaffolding, Configuration & Deployment

## Overview

Initialize the Next.js project with all dependencies, configure authentication environment, set up Netlify deployment, and create the seed data file.

## Prerequisites

- Node.js 18+ installed
- npm as package manager
- The repo already has: README.md, CLAUDE.md, specs/prompt.md, .gitignore (with .vscode/ and .DS_Store only)

---

## Task 1.1: Initialize Next.js Project

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

| Flag | Purpose |
|---|---|
| `.` | Initialize in current directory (repo already has files) |
| `--src-dir` | Use `src/` directory layout |
| `--app` | App Router (not Pages Router) |
| `--typescript` | TypeScript support |
| `--tailwind` | Tailwind CSS |
| `--eslint` | ESLint |
| `--use-npm` | npm package manager |
| `--import-alias "@/*"` | Path alias mapping `@/` to `src/` |

**Note**: `create-next-app` in a non-empty directory may warn about existing files. It keeps existing files and adds new ones. The existing `README.md` may be overwritten — back it up or merge after.

**Generated files**: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.

---

## Task 1.2: Initialize shadcn/ui

```bash
npx shadcn@latest init
```

Interactive prompts — select:
- Style: **Default**
- Base color: **Neutral** (minimalist design per spec)
- CSS variables: **Yes**

**Generated files**: `components.json`, `src/lib/utils.ts` (with the `cn()` Tailwind merge utility).

---

## Task 1.3: Install shadcn/ui Components

```bash
npx shadcn@latest add button input dialog select tooltip label
```

Each component lands as a standalone `.tsx` file in `src/components/ui/`. These are fully owned source files (not node_modules) and can be customized.

| Component | File | Used For |
|---|---|---|
| `button` | `src/components/ui/button.tsx` | Login/logout, add event, form submit, delete confirm |
| `input` | `src/components/ui/input.tsx` | Year, name, region, search bar |
| `dialog` | `src/components/ui/dialog.tsx` | Add/edit event modal, delete confirmation |
| `select` | `src/components/ui/select.tsx` | Category filter dropdown, category field in form |
| `tooltip` | `src/components/ui/tooltip.tsx` | Description tooltip on timeline entries |
| `label` | `src/components/ui/label.tsx` | Form field labels |

---

## Task 1.4: Install Additional Dependencies

```bash
npm install next-auth@beta lucide-react
```

| Package | Version | Purpose |
|---|---|---|
| `next-auth@beta` | v5 (beta) | NextAuth.js v5 — App Router-native auth. The `@beta` tag is required for v5. |
| `lucide-react` | latest | Icon library for edit (Pencil) and delete (Trash2) icons on timeline entries |

**Note**: `@netlify/plugin-nextjs` is NOT installed as a dependency. Netlify auto-detects Next.js projects. It's only referenced in `netlify.toml`.

---

## Task 1.5: Update .gitignore

The existing `.gitignore` only has `.vscode/` and `.DS_Store`. After `create-next-app`, verify or update to include:

```gitignore
# dependencies
/node_modules

# next.js
/.next/
/out/

# env files
.env*.local

# misc
.DS_Store
*.pem
.vscode/

# debug
npm-debug.log*

# netlify
.netlify
```

---

## Task 1.6: Create Environment Variables

**File: `.env.local`** (git-ignored, never committed)

```env
# NextAuth GitHub OAuth (auto-detected by NextAuth v5 GitHub provider)
AUTH_GITHUB_ID=<GitHub OAuth App Client ID>
AUTH_GITHUB_SECRET=<GitHub OAuth App Client Secret>

# NextAuth secret — required in production. Generate with: npx auth secret
AUTH_SECRET=<random string>

# App-specific: owner gating + GitHub Contents API
GITHUB_OWNER=<GitHub username of the app owner>
GITHUB_REPO=on-the-edge
GITHUB_TOKEN=<Personal Access Token with repo scope>
```

| Variable | Used By | Purpose |
|---|---|---|
| `AUTH_GITHUB_ID` | NextAuth v5 GitHub provider | OAuth App Client ID (auto-detected) |
| `AUTH_GITHUB_SECRET` | NextAuth v5 GitHub provider | OAuth App Client Secret (auto-detected) |
| `AUTH_SECRET` | NextAuth v5 | Signs/encrypts JWT tokens |
| `GITHUB_OWNER` | Auth callbacks + API routes | Whitelist: only this GitHub user gets write access |
| `GITHUB_REPO` | GitHub Contents API service | Identifies the repo for API calls |
| `GITHUB_TOKEN` | GitHub Contents API service | PAT with `repo` scope for read/write `data/events.json` |

### GitHub OAuth App Setup

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Application name: "On the Edge"
3. Homepage URL: `http://localhost:3000` (update for production)
4. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
5. For production on Netlify: add `https://<your-site>.netlify.app/api/auth/callback/github`

### GitHub Personal Access Token Setup

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Repository access: select the `on-the-edge` repo
3. Permissions: Contents → Read and write
4. Generate and copy to `GITHUB_TOKEN`

---

## Task 1.7: Create Netlify Configuration

**File: `netlify.toml`** (project root)

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

- The publish directory `.next` is where Next.js outputs its build. The Netlify plugin converts this to Netlify functions/edge functions.
- The plugin supports: SSR, ISR, on-demand revalidation (`revalidateTag`), Server Components, Server Actions, Middleware, Image optimization.
- Environment variables must be set separately in Netlify dashboard: Site Settings → Environment Variables. Add all 6 env vars from `.env.local`.

---

## Task 1.8: Create Seed Data File

**File: `data/events.json`** (project root — this is the "GitHub-as-DB" storage file)

```json
{
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "year": -3000,
      "name": "Invention de l'ecriture",
      "category": "invention",
      "endYear": null,
      "region": "Mesopotamie",
      "description": "Les Sumeriens developpent l'ecriture cuneiforme."
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "year": -27,
      "name": "Empire romain",
      "category": "civilization",
      "endYear": 476,
      "region": "Europe",
      "description": "De la fondation de l'Empire par Auguste a la chute de Rome."
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "year": 1440,
      "name": "Imprimerie",
      "category": "invention",
      "endYear": null,
      "region": "Allemagne",
      "description": "Gutenberg invente l'imprimerie a caracteres mobiles."
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "year": 1687,
      "name": "Lois de Newton",
      "category": "discovery",
      "endYear": null,
      "region": "Angleterre",
      "description": "Publication des Principia Mathematica."
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440005",
      "year": 1789,
      "name": "Revolution francaise",
      "category": "event",
      "endYear": 1799,
      "region": "France",
      "description": null
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440006",
      "year": 1879,
      "name": "Albert Einstein",
      "category": "person",
      "endYear": 1955,
      "region": "Allemagne",
      "description": "Physicien theoricien, theorie de la relativite."
    }
  ]
}
```

This file must be committed to the repo so the GitHub Contents API can find it. Covers all 5 categories with BC/AD dates, with/without endYear and descriptions.

---

## Task 1.9: Update CLAUDE.md

Update the project status section to reflect the scaffolded state — tech stack, file structure, available npm scripts.

---

## Execution Order

```
1.1 → 1.2 → 1.3 → 1.4  (sequential: each depends on previous)
        ↓
1.5, 1.6, 1.7, 1.8, 1.9  (parallel: independent of each other)
```

## Verification Checklist

- [ ] `npm run dev` starts without errors at localhost:3000
- [ ] Default Next.js page renders
- [ ] `src/components/ui/` contains 6 shadcn component files
- [ ] `src/lib/utils.ts` exists with `cn()` function
- [ ] `.env.local` has all 6 variables (with placeholder values)
- [ ] `netlify.toml` exists at root
- [ ] `data/events.json` exists with 6 seed events
- [ ] `.gitignore` includes node_modules, .next, .env*.local
