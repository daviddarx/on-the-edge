# Briefing

- I want to create a simple app where I can add several key dates of the history of the humanity.
- This is a personal project. The goal is to have a better overview of what would be invented when in the humanity.
- The app will then display it chronologically.
- For each key date I will need to add
  - a date (year, number input — negative values for BC dates, e.g. `-44` for 44 BC)
  - a name (text input)
  - a predefined category (select input)
  - optional: an end date (year, number input)
  - optional: a region (text input)
  - optional: a short description (text input — shown as a tooltip on hover in the timeline)
- The predefined categories are:
  - invention
  - event
  - person
  - discovery (scientific breakthroughs not tied to a specific object)
  - civilization (rise/fall of empires, formation of nations)

# Access model

- **Public read**: anyone can view the timeline without logging in.
- **Owner-only write**: only the whitelisted GitHub account (set via `GITHUB_OWNER` env var) can add, edit, or delete entries.

# UI and behaviors

Here is a full description of what the UI will look like.

- Login/logout button.
- Title: "On the edge"
- Lead: "Simple timeline viewer for major dates in human history."
- Button: "Add a new date". Only displayed when the user is logged in.
- Select: Filter by category. Default to "All categories". Each category has its own colour.
- When "All categories" is chosen, show a legend bar between the filter and the timeline with the label for each category and its colour. This bar is sticky (position sticky) when the user scrolls through the timeline.
- Search bar above the timeline: real-time, client-side filtering by name and region.
- Timeline:
  - A simple vertical line where all the dates are displayed on top of each other.
  - The newest dates are displayed on the top, the oldest at the bottom.
  - Each date is a small dot on the timeline with the date and label to its left.
    - Example: • 1540: Pistolet
    - Example with end date and region: • 1939-1945: Deuxième guerre mondiale (Europe)
  - Dates with a description show a tooltip on hover.
  - Each dot has the colour of its category.
  - When the user is logged in, hovering a timeline entry reveals edit and delete icons.
    - Clicking the edit icon opens the same modal form pre-filled with the entry's data.
    - Clicking the delete icon deletes the entry.
- When the user filters by category, only items of that category are displayed in the timeline.
- When the user clicks "Add a new date", a modal opens with all fields stacked vertically.
- Responsive layout:
  - On mobile each element is displayed vertically after each other. Column padding: 20 px.
  - The column has a max width of 800 px.
- Look and Feel: minimalist design — just implement layouts to position elements without heavy styling.

# Tech stack

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (default styles)
- **Auth**: GitHub OAuth via NextAuth.js; only the account matching `GITHUB_OWNER` env var has write access
- **Database**: GitHub-as-DB — `data/events.json` stored in the same repository, read and written via the GitHub Contents API
- **Deployment**: Netlify with `@netlify/plugin-nextjs`

# Environment variables

| Variable | Description |
|---|---|
| `GITHUB_OWNER` | GitHub username — used both to whitelist the write-access account and to identify the repo owner for GitHub Contents API calls |
| `GITHUB_REPO` | Repository name (e.g. `on-the-edge`) |
| `GITHUB_TOKEN` | Personal Access Token with `repo` scope — used to read/write `data/events.json` via the GitHub Contents API |

Set these in `.env.local` for local development and in Netlify → Site Settings → Environment Variables for production.
