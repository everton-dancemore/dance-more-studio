# Dance More — Studio

A premium student-file app for **Dance More**, the wedding-dance teaching brand.
Built in Next.js + React + Tailwind to match the brand's black-and-gold,
serif-headed aesthetic. Data lives in the browser (`localStorage`) — no backend,
no sign-up.

## Why this exists

The previous third-party tool only tracked flat lessons (date, time, notes,
"Mark complete"). That hides everything that actually matters in a wedding-dance
journey:

- How close the wedding is
- The milestones along the way (consultation, choreography lock, dress rehearsal, run-through, wedding day)
- A visual sense of where the couple is in their package

This app puts the **countdown** and the **milestones** front and centre.

## Quick start

Node.js is **not** installed on this machine. Install it once, then run:

```bash
# 1. Install Node.js 20+ (use the official installer or any Node version manager you prefer)
#    https://nodejs.org/  →  the "LTS" download for macOS
#
#    Or via Homebrew (if you'd like to install Homebrew too):
#    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
#    brew install node

# 2. Install project dependencies
cd ~/projects/dance-more-studio
npm install

# 3. Run the dev server
npm run dev

# 4. Open http://localhost:3000
```

## Project layout

```
app/                    # Next.js App Router pages
  page.tsx              # /            — your couples (sorted by days-to-wedding)
  couples/new/page.tsx  # /couples/new — create-couple form
  couples/[id]/page.tsx # /couples/:id — STUDENT FILE (the redesign)
components/
  brand/                # Logo, TopNav
  couple/               # CountdownBadge, CoupleHeader, JourneyTimeline,
                        # MilestonesPanel, LessonsList, LessonRow,
                        # PackageProgressBar, NotesCard
  ui/                   # Button, Input, Card, Pill (hand-written primitives)
hooks/
  useCouples.ts         # single source of truth over localStorage
lib/
  types.ts              # Couple, Lesson, Milestone, Package
  storage.ts            # versioned localStorage envelope
  countdown.ts          # daysUntil, formatCountdown
  milestones.ts         # generateDefaultMilestones / generateDefaultLessons
  utils.ts              # cn(), uid(), nowIso()
```

## Brand notes

- **Logo** — the wordmark currently renders as a styled text fallback. To use
  your real brushed wordmark, drop the file into `public/dance-more-logo.png`
  and switch `components/brand/Logo.tsx` to an `<Image>`.
- **Colors** are defined in `app/globals.css` under `@theme`. Gold is used
  **sparingly** — countdown, completed states, and the one primary action per
  view — so it always feels deliberate and premium, never noisy.
- **Fonts**: Cormorant Garamond (display, matches your pricing page headlines)
  and Inter (body). Loaded via `next/font` so there's no FOUC.

## Try it: end-to-end smoke test

1. Click **+ New couple**
2. Fill in `Joshua` / `Emma`, wedding date e.g. `2026-07-19`, venue `Everton`,
   package `THE MOMENT`, song `Perfect — Ed Sheeran`
3. Land on the student file — you should see:
   - A serif **JOSHUA & EMMA** title
   - A gold countdown badge with the correct number of days
   - A horizontal **journey timeline** with 8 lesson dots, milestone markers,
     and a gold heart at the wedding-day end
   - A **Milestones** card with 6 auto-suggested defaults
   - A **Lessons** card with 8 compact rows (each expands inline)
4. Mark one lesson done, mark "Choreography locked" complete, refresh — values
   persist via `localStorage`

## Data

All data lives in `localStorage` under the key `dance-more-studio:v1`, in a
versioned envelope (so future migrations stay clean). To wipe everything:
open DevTools → Application → Local Storage → delete that key, or run
`localStorage.removeItem('dance-more-studio:v1')` in the console.

## Out of scope (intentional, for now)

- Multi-device sync / accounts — local-only
- Payments, invoicing
- Couple-facing portal
- Video uploads (use external URLs on lessons instead)
