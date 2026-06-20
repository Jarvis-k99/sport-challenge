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

- **Period**: 4 May → 30 Aug 2026. Source of truth: `challenge_config` table; `/rules` renders it live.
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

**Reset the bucket / shift the challenge dates.**
Edit `challenge_config` (e.g. `UPDATE public.challenge_config SET start_date = '...' WHERE id = 1`). All views recompute on the next page load — nothing else to invalidate. To clear test data from prior resolved challenges, `DELETE FROM challenges WHERE status = 'inactive'`.

## Pointers for future maintainers (human or agent)

- **Auto-memory** lives at `~/Library/Application Support/Claude/local-agent-mode-sessions/<id>/spaces/<id>/memory/`. Read `MEMORY.md` first; `project_sport_challenge.md` has the locked-in decisions and v1/v2 history.
- **Agent conventions**: any multi-step instruction is labeled `In VSCode terminal:` or `In Supabase SQL Editor:` so there's no ambiguity about which surface a step runs on. Keep this convention going.
- **Migrations are the source of truth for the data model.** Don't reverse-engineer schema from the React/SQL queries — open `supabase/migrations/` and read the numbered files in order. Each is idempotent and safe to re-run.
