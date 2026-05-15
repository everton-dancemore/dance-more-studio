# Dance More Studio — Master Brief

> **Purpose of this document**: a single, self-contained handoff document so any developer (or AI assistant) can understand the full project state without reading the chat history that built it.

---

## 1. Business context

**Dance More** is a wedding-dance teaching business based in Sydney, Australia. The owner (Everton) and a small team of teachers (Fernando, etc.) deliver private dance lessons to couples preparing for their wedding (e.g. 8-lesson "Wedding Dance" packages) and to "private students" who set a personal goal rather than a wedding date.

The owner previously used:
1. **Google Keep** for ad-hoc lesson tracking (free-form notes, photos)
2. **A Lovable.dev-built admin dashboard** ("dance-more-dashboard" on Lovable) that uses a Supabase database to track students, lessons, payments, etc.

The Lovable dashboard is generic and not mobile-friendly. The teachers (who teach in-studio with an iPhone in hand) needed a **mobile-first interface** to mark lessons complete, take notes, and upload photos during/between lessons.

This repo (`dance-more-studio`) is a **separate Next.js front-end** that **reads from and writes to the same Supabase database** as the Lovable dashboard. There is no separate backend; both apps share Supabase as the single source of truth.

---

## 2. Live URLs

| Asset | URL |
|---|---|
| Production app | https://dance-more-studio.vercel.app |
| GitHub repo | https://github.com/everton-dancemore/dance-more-studio (private) |
| Supabase project | https://supabase.com/dashboard/project/itnralkojjpsldpaiczw |
| Lovable admin (the other app) | hosted on Lovable.dev under the owner's account |

---

## 3. Tech stack

- **Framework**: Next.js 15.1.6 (App Router) + React 19 + TypeScript 5.7
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **UI primitives**: hand-written (in `components/ui/`) — no shadcn, no Radix
- **Icons**: `lucide-react`
- **Dates**: `date-fns`
- **Backend**: Supabase (auth + Postgres + Storage) via `@supabase/ssr` + `@supabase/supabase-js`
- **Hosting**: Vercel (auto-deploys from GitHub `main` branch)
- **Fonts** (via `next/font/google`): **Cormorant Garamond** (serif display, weights 500/600/700) + **Inter** (body, weights 400/500/600)

---

## 4. Brand & design system

Defined in `app/globals.css` as CSS variables.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0A0A0A` | Page background |
| `--color-surface` | `#111111` | Cards |
| `--color-surface-2` | `#161616` | Raised / hover |
| `--color-border` | `#262626` | Default border |
| `--color-border-strong` | `#3A3A3A` | Hover border |
| `--color-gold` | `#F5B945` | Primary accent (countdown, CTA) |
| `--color-gold-bright` | `#FCD27A` | Lighter gold for emphasis |
| `--color-gold-soft` | `#F5B94533` | Gold @ 20% |
| `--color-text` | `#F5F5F5` | Primary text |
| `--color-text-mute` | `#A1A1A1` | Secondary text |
| `--color-text-dim` | `#6B6B6B` | Hints, captions |
| `--color-success` | `#7FCFA1` | "Done" pill |
| `--color-danger` | `#E5736B` | Missed lesson / overdue |

**Design rule**: gold is a *scarce* accent (CTAs, completed state, key dates). Everything else stays white/muted on near-black. This keeps the dark theme feeling premium, not gimmicky.

The wordmark logo lives at `public/logo.jpg` (1024×940, gold brushstroke on black). Next.js auto-generates the favicon from `app/icon.jpg` and the iOS home-screen icon from `app/apple-icon.jpg` (both copies of the same logo).

---

## 5. Data model — Supabase schema (the parts this app uses)

The full schema is much larger (managed by the Lovable app and includes leads, ads, taxes, etc.). This app touches only the following tables/columns. They're modelled in **`lib/db-types.ts`**.

### `students`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | e.g. "Joshua & Emma" or "Karoline" |
| `style` | text \| null | e.g. "Rumba", "Foxtrot" |
| `teacher_id` | uuid \| null | FK → teachers.id |
| `lesson_template` | int \| null | |
| `lessons` | text \| null | Free text like "12 LESSONS" |
| `lessons_total` | int \| null | Used for progress bar |
| `lessons_remaining` | int \| null | Used for progress bar |
| `payment_status` | text \| null | "overdue" triggers a red pill |
| `amount` | numeric \| null | |
| `status` | text \| null | "active" / "completed" |
| `source_lead_id` | uuid \| null | |
| **`student_type`** | text default `'wedding'`, check (`'wedding'`,`'private'`) | **Added by us via Lovable** |
| **`wedding_date`** | date \| null | **Added by us via Lovable** — used for the gold countdown |
| **`goal`** | text \| null | **Added by us via Lovable** — shown instead of a wedding date for private students |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz \| null | |

The three bold columns were added by asking the Lovable AI to run:
```sql
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS student_type TEXT
    DEFAULT 'wedding'
    CHECK (student_type IN ('wedding', 'private')),
  ADD COLUMN IF NOT EXISTS wedding_date DATE,
  ADD COLUMN IF NOT EXISTS goal TEXT;
```

### `lessons`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `student_id` | uuid | FK |
| `teacher_id` | uuid \| null | FK |
| `lesson_number` | int | 1..N within package |
| `scheduled_date` | date \| null | |
| `scheduled_start` | timestamptz \| null | |
| `scheduled_end` | timestamptz \| null | |
| `status` | enum: `scheduled` \| `completed` \| `missed` \| `rescheduled` | |
| `notes` | text \| null | |
| `photo_urls` | text[] \| null | Array of public URLs into the `lesson-photos` storage bucket |
| `is_favourite` | bool \| null | Star toggle in UI |
| `completed_at` | timestamptz \| null | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz \| null | |

### `profiles`, `user_roles`, `teachers`
Standard Supabase auth → profile linkage:
- `profiles.user_id` matches `auth.users.id`
- `profiles.teacher_id` links a logged-in user to their `teachers` row
- `user_roles.role` is one of `admin | moderator | user | teacher`

### Supabase Storage
- Bucket: **`lesson-photos`** (public read; authenticated insert/update/delete)
- Path layout: `lesson-photos/{lessonId}/{timestamp}-{random}.{ext}`
- Created via the Lovable AI alongside the schema ALTER above.

---

## 6. File map (everything in this repo)

```
dance-more-studio/
├─ app/
│  ├─ layout.tsx              # Fonts, html shell, viewport
│  ├─ globals.css             # Tailwind v4 + brand tokens
│  ├─ page.tsx                # Root redirect (auth → /teacher | none → /auth)
│  ├─ icon.jpg                # Auto-generates favicon (Next.js convention)
│  ├─ apple-icon.jpg          # Auto-generates iPhone home-screen icon
│  ├─ auth/
│  │  └─ page.tsx             # Email/password sign-in form
│  └─ teacher/
│     ├─ page.tsx             # Student list (teacher's dashboard)
│     └─ students/[id]/
│        └─ page.tsx          # Student file: wedding/goal block,
│                             #   progress, lesson list with notes,
│                             #   status, favourites, photo upload
├─ components/
│  ├─ brand/
│  │  └─ Logo.tsx             # Wraps /logo.jpg in <Image>
│  └─ ui/
│     ├─ Button.tsx           # Primary/secondary buttons
│     ├─ Card.tsx, CardBody
│     ├─ Input.tsx, Textarea, Label
│     └─ Pill.tsx             # Tone variants: gold|mute|success|danger|outline
├─ hooks/
│  ├─ useAuth.ts              # Session, signIn, signOut, role flags
│  ├─ useStudents.ts          # List students by teacher_id; single student fetch
│  ├─ useLessons.ts           # Fetch lessons for a student, optimistic updates
│  └─ useLessonPhotos.ts      # Upload to Supabase Storage, derive public URL
├─ lib/
│  ├─ supabase.ts             # Singleton browser client (uses @supabase/ssr)
│  ├─ db-types.ts             # Hand-written TS subset of the Supabase schema
│  ├─ countdown.ts            # daysUntil, formatCountdown (pure functions)
│  └─ utils.ts                # cn() class merger (clsx + tailwind-merge)
├─ public/
│  └─ logo.jpg                # 1024×940 wordmark on black
├─ .env.local                 # NEXT_PUBLIC_SUPABASE_URL + ANON_KEY (gitignored)
├─ next.config.mjs            # Default + reactStrictMode: true
├─ package.json
├─ tsconfig.json
└─ MASTER_BRIEF.md            # This document
```

---

## 7. Auth flow

1. User lands on `/` → `useAuth` runs `loadSession()` → either:
   - No session → hard-navigate to `/auth`
   - Has session → fetch profile + roles → hard-navigate to `/teacher`
2. `/auth` renders the email/password form.
3. On submit: `signIn(email, password)` calls `supabase.auth.signInWithPassword`.
4. On success: hard-navigate `window.location.replace('/teacher')`. We use `window.location.replace`, **not** `router.replace`, because iOS Safari's client-side router has been observed to silently no-op under some PWA/cache conditions — full page reloads cannot be ignored.
5. Sign-out (top-right of `/teacher`) calls `signOut()`, then `window.location.replace('/auth')`. The hook's `signOut()` clears local state synchronously BEFORE awaiting the network call so the UI updates instantly.

### Safety nets (all in `hooks/useAuth.ts`)
- 6-second timeout on profile/roles fetch (`Promise.race`)
- If profile/roles fail or time out, the user is still let through with empty roles (instead of an infinite spinner)
- 8-second **hard failsafe** in the mount effect: under no circumstances does `loading` stay `true` past 8s
- `mounted` ref guards every `setState` to prevent leaks after unmount
- Root page surfaces a "Taking longer than expected" fallback after **3 seconds** with two buttons: `Reload page` and `Reset & sign in again` (the second clears all `sb-*`/`supabase` keys from localStorage)

---

## 8. Feature inventory

### `/teacher` — Student list
- Greeting based on hour of day + user's first name from `profile.full_name`
- Search filter over student name
- Two sections: **Active** and **Completed** (based on `student.status`)
- Each student card shows:
  - Name (serif)
  - Either `· N days to go` (gold) for wedding students with a date, OR `· {goal}` (muted) for private students, OR `· {style}` as fallback
  - Lessons-done / lessons-total + mini progress bar
  - Red `Overdue` pill if `payment_status === 'overdue'`
- Empty state when no students assigned
- Sign-out button top-right (with `signingOut` guard and `disabled` state)

### `/teacher/students/[id]` — Student file
- Sticky header with hard-navigation back button + small logo + "Student file" label
- Hero: huge serif student name + type pill (`WEDDING` gold, or `PRIVATE` outline)
- **`<StudentMeta>` block**:
  - Wedding student → gold "Wedding day" card with `EEEE d MMMM yyyy` and `formatCountdown(daysUntil(wedding_date))`
  - Private student → "Goal" card with the goal text in serif
  - Missing data → muted placeholder ("No wedding date set yet" / "No goal set yet")
- Package progress bar (slim, gold gradient)
- **Lessons list** — collapsed by default:
  - Each row: ⭐ favourite toggle · `01` number · date label · notes preview · status badge or `Done` CTA
  - Tap row → expands inline:
    - `<Textarea>` for notes (commits on blur)
    - **Photo thumbnail strip** — horizontally scrollable 64×64 thumbnails. Tap to open a black-overlay lightbox; small trash button to delete (asks confirm)
    - **Photo button** — `<label>` wrapping a hidden `<input type="file" accept="image/*" capture="environment">` so iPhone opens the camera directly
    - Status segmented control: Scheduled / Done / Missed / Resched.

### `/auth` — Sign in
- Email + password
- Show/hide password toggle
- Auto-redirects to `/teacher` if already signed in
- Error banner appears below if signIn throws

---

## 9. Deployment & DevOps

- **GitHub → Vercel auto-deploy**: every push to `main` triggers a new Vercel production deploy.
- **Env vars on Vercel**:
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://itnralkojjpsldpaiczw.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Supabase anon JWT, safe to expose; only enforces RLS)
- **Supabase Auth config**: the production URL `https://dance-more-studio.vercel.app` is on Supabase's Site URL / Redirect URLs allow-list (Lovable handled this).
- **Local dev**: `npm run dev` on port 3000, bound to `0.0.0.0` so iPhones on the same Wi-Fi can connect to `http://192.168.x.x:3000` for in-network testing.

### Local commands
```bash
npm install      # one time
npm run dev      # local dev with Wi-Fi access
npm run build    # production build sanity check
npm run lint     # next lint
npx tsc --noEmit # type check (we have one @ts-expect-error for Supabase update() inference)
```

---

## 10. Known issues, quirks & recent changes

### Recent (last session) — freeze bugs and the fix
**Symptom**: on iOS Safari, every navigation appeared to freeze — clicking Sign in left the user on `/auth`; Sign out didn't go to `/auth`; the back button on the student file didn't return to `/teacher`. Root page got stuck on the "Loading…" screen.

**Diagnosis**:
- Some hangs were the auth `loading` state never resolving (Supabase fetches hanging silently)
- Some hangs were Next.js's client-side router silently no-op'ing on iOS Safari, likely due to bfcache / PWA install state

**Fixes applied**:
1. `hooks/useAuth.ts` — added 6s timeout on profile/roles and an 8s hard failsafe on the loading state; signOut clears state synchronously before the network call
2. `app/page.tsx` — fallback UI at 3s with `Reload page` and `Reset & sign in again` (localStorage wipe) buttons
3. **Switched every important navigation from `router.push/replace` to `window.location.replace/assign`** (full page reload). Routes affected:
   - `/auth` → `/teacher` after sign-in
   - `/teacher` → `/auth` after sign-out
   - `/teacher/students/[id]` → `/teacher` for the back button
   - `/` (root) → `/auth` or `/teacher` redirects
4. `app/teacher/students/[id]/page.tsx` — wrapped `parseISO/format` in a try/catch so a malformed `wedding_date` or `scheduled_date` cannot crash the page

### Other quirks
- **TypeScript & Supabase inference**: one `@ts-expect-error` in `hooks/useLessons.ts` for the `update(patch)` call — Supabase's generic update type doesn't resolve from our hand-written `Database` type. Runtime is correct.
- **Logo image is a JPG with black background** (no transparency). We use `object-cover` to crop the dark top/bottom padding and reveal just the wordmark band. This means at very small sizes (`size="sm"` = 96×28 px) the wordmark looks tight; if a tighter source crop or an SVG version becomes available, replace `public/logo.jpg` and the rendering will improve automatically.
- **Photo bucket assumes public read**. URLs are public-by-obscurity. If the owner wants stricter access (signed URLs), `useLessonPhotos.uploadPhoto` would need to return a signed URL with an expiry and we'd need to refresh URLs when displaying old photos.
- **No inline student-create/edit yet**. Adding students, setting `wedding_date`, etc. must still happen via the Lovable admin or direct SQL. Out of scope for this iteration.
- **Multi-photo per lesson**. Implemented. Up to as many as the user wants — we just append to `photo_urls`. No upload size limit enforced in app; rely on Supabase Storage's defaults.

---

## 11. Verification checklist (end-to-end smoke test)

Run after any non-trivial change:

1. ✅ `npm run build` — completes without errors
2. ✅ On the live URL, hard-refresh in Safari
3. ✅ Sign in → land on `/teacher` with student list
4. ✅ Open a student → wedding countdown or goal renders
5. ✅ Mark a lesson done → status pill updates
6. ✅ Star a lesson → star fills gold
7. ✅ Type notes → blur → notes persist after page refresh
8. ✅ Tap Photo → camera/library opens → after upload thumbnail appears
9. ✅ Tap a thumbnail → full-screen lightbox opens; tap to dismiss
10. ✅ Tap trash on a thumbnail → confirm → photo removed
11. ✅ Back button → returns to `/teacher`
12. ✅ Sign out → returns to `/auth` (no freeze)
13. ✅ Refresh the live URL while signed in → lands directly in `/teacher` (auto-redirect from `/`)

---

## 12. Out of scope / future work

Things not built yet, in rough priority order:

1. **Inline edit of `wedding_date` and `goal`** from the student file — currently must use Lovable or SQL
2. **Add new student** from the app — currently Lovable admin only
3. **Custom domain** (e.g. `studio.dancemore.com.au`) — currently `*.vercel.app`
4. **Bulk import from Google Keep** — owner has ~12 months of historical lesson notes in Keep
5. **Calendar view** of all lessons across all students
6. **Push notifications** for upcoming lessons
7. **Couple-facing portal** so students can see their own progress
8. **Studio dashboard** — total lessons this week, upcoming weddings, payment status across all teachers
9. **Service-worker-based offline cache** — useful in a venue with poor Wi-Fi
10. **Tighter Storage RLS** — currently authenticated users can delete any photo; could lock to owner

---

## 13. How to brief a new specialist

If you're handing this to another developer or AI:

> "This is a Next.js 15 + Supabase mobile-first PWA. Read **MASTER_BRIEF.md** in the repo root. The Supabase project is shared with a separately-hosted Lovable admin app — do not modify schema directly; ask the user to run schema changes via Lovable. All navigation uses `window.location` not `router.push` (iOS Safari quirk). Live URL: https://dance-more-studio.vercel.app. Deploy is automatic on push to `main`."

That paragraph + this document is enough for anyone to onboard.

---

*Last updated: 15 May (during the initial build session). Latest commit at time of writing: `49ed2a8 fix: use hard navigations everywhere to bypass iOS PWA router issues`.*
