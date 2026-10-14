# Sport Challenge

A closed mini web-app for tracking a sports challenge among five friends. Each week, everyone needs to log at least three sessions (running, gym, biking, climbing, yoga, swimming, hiking, skiing, or "other"). Miss a week and you owe €5 into a shared bucket. Anyone can also challenge anyone else to a peer bet; the loser pays the same bucket. The bucket is virtual — settled in person at the end.

**Production**: deployed on Vercel — see the `sport-challenge` project under the `jarvis-k99` team.
**Players**: Marlo (admin), Moritz, Lukas, Bruno, Luca. Pre-issued accounts, no public signup.
**Repo**: <https://github.com/Jarvis-k99/sport-challenge>

## Stack & repo layout

Next.js 14 (App Router, TypeScript, Tailwind) on Vercel · Supabase (Postgres + Auth + Storage + RLS) · pre-issued email/password auth, no public signup.

```
sport_challenge/
├── src/
│   ├── app/                   Next.js App Router — one folder per route
│   │   ├── page.tsx               Dashboard
│   │   ├── login/                 Sign in
│   │   ├── log/                   Log activity (form + this-week list with delete)
│   │   ├── challenge/new/         Create a peer challenge
│   │   ├── stats/                 Leaderboard + per-user breakdown (pie chart)
│   │   ├── rules/                 Live-rendered challenge rules
│   │   ├── admin/                 Resolve active challenges (admin only)
│   │   └── auth/signout/          Logout route handler
│   ├── components/            UI pieces (dashboard/, stats/, PhotoThumb, etc.)
│   └── lib/                   Pure helpers — format, week, photo, supabase clients, activity colors
├── supabase/
│   └── migrations/            Numbered SQL files, applied via Supabase SQL Editor
├── scripts/                   Optional: db.sh wrapper for psql (rarely needed)
├── middleware.ts              Auth-token refresh + login redirects
├── next.config.mjs            Server Action body limit (5mb) + react strict
└── package.json
```

## The rules in four lines

- **Period**: set per season in the `challenge_config` table (`season_name`, `start_date`, `end_date`); `/rules` renders it live. Season 1 ran 18 May → 30 Aug 2026 (frozen in `season_archive`, viewable at `/archive`). Winter 2026/27 runs 12 Oct 2026 → 28 Feb 2027.
- **Weekly target**: ≥3 sessions Mon–Sun, each ≥45 min (honor system on duration).
- **Penalty**: €5 per missed week into the bucket, computed per closed week from `v_missed_weeks`.
- **Peer challenges**: status flow `pending → active → inactive`. Target accepts/declines; admin resolves and picks the loser. The loser's amount lands in the bucket via `v_bucket_summary`.

Late joiners are exempted from weeks before they joined via `profiles.joined_at` (see migration 010).

## Working on it locally

**Setup** (first time):

```bash
git clone https://github.com/Jarvis-k99/sport-challenge.git
cd sport-challenge
cp .env.example .env.local        # then fill in Supabase URL + keys
npm install
npm run dev                       # http://localhost:3000
```

**Apply a SQL migration:**

1. *In VSCode terminal*: `pbcopy < supabase/migrations/<NNN_name>.sql`
2. *In Supabase Dashboard*: SQL Editor → new query → clear it → ⌘V → **Run**
3. Read the Results pane — every migration ends with a `select '... created' as status` so success is obvious.

**Deploy:**

```bash
git add . && git commit -m "..." && git push
```

Vercel auto-builds on push to `main`. Failures show up in the Vercel dashboard with full build logs.

## Admin recipes

**Onboard a new user.**
Supabase Dashboard → Authentication → Users → Add user → fill email + password, toggle Auto Confirm ON. The `handle_new_user` trigger auto-creates the profile row with a default display name. Then run a one-line `UPDATE` to set their real display name — pattern in `supabase/migrations/009_add_luca.sql`.

**Exempt a late joiner from past weeks.**
`profiles.joined_at` defaults to the current date for new profiles, so any user created after the challenge start is automatically exempted from pre-join weeks. To set or update an existing user's join date manually, see the `UPDATE` pattern in `supabase/migrations/010_per_user_joined_at.sql`.

**Resolve a peer challenge.**
Sign in as admin (Marlo), open `/admin`, pick the loser via the radio buttons, optional note, **Resolve**. The loser's amount automatically lands in `v_bucket_summary` and on everyone's dashboard.

**Start a new season.**
Every fee view reads the single `challenge_config` row, so never just change the dates — that would rewrite the finished season. Resolve all open challenges first, then run `011_season_archive.sql`-style archiving (snapshot into `season_archive`, tag resolved challenges via `challenges.archived_in`) and finally update `challenge_config` (see `012_winter_season.sql`). Then run `013_season_scoped_counting.sql` once. Pending/active challenges carry over. The Supabase free tier pauses after ~7 idle days; `/api/keepalive` (daily Vercel cron, see `vercel.json`) prevents that.

**Reset the bucket / shift the challenge dates within a season.**
Edit `challenge_config` (e.g. `UPDATE public.challenge_config SET start_date = '...' WHERE id = 1`). All views recompute on the next page load — nothing else to invalidate. To clear test data from prior resolved challenges, `DELETE FROM challenges WHERE status = 'inactive'`.

## Seasons in the app

`/stats` has a season dropdown (Leaderboard and Breakdown). The running season is the default and reads the live views; finished seasons are rebuilt from their frozen `season_archive` snapshot (`src/lib/season-archive.ts`) plus the raw entries inside that season's dates (category pie, activity list). When the next season ends, run the same archive step once and it appears in the dropdown automatically.

## One rule: everything counts inside the current season

`challenge_config` (row id = 1) is the single definition of the current season. All counting — sessions, missed weeks, fees, the weekly progress, the breakdown pie — must be limited to `[start_date, end_date]`. In SQL, join `challenge_config`; in app code, read it with `fetchSeason()` and use `seasonRange()` (`src/lib/season.ts`). Never count raw `entries`.

## Pointers for future maintainers (human or agent)

- **Auto-memory** lives at `~/Library/Application Support/Claude/local-agent-mode-sessions/<id>/spaces/<id>/memory/`. Read `MEMORY.md` first; `project_sport_challenge.md` has the locked-in decisions and v1/v2 history.
- **Agent conventions**: any multi-step instruction is labeled `In VSCode terminal:` or `In Supabase SQL Editor:` so there's no ambiguity about which surface a step runs on. Keep this convention going.
- **Migrations are the source of truth for the data model.** Don't reverse-engineer schema from the React/SQL queries — open `supabase/migrations/` and read the numbered files in order. Each is idempotent and safe to re-run.
