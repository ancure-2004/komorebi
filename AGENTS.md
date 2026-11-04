# Komorebi
Next.js 16 App Router, React 19, TypeScript, Tailwind v3, Framer Motion, Zustand (persist), Supabase (Auth, Realtime, Storage, Edge Functions).
- Read docs/IMPLEMENTATION.md and the product spec before changing behaviour. Section numbers there are the source of truth.
- All schedule logic uses IST via lib/time.ts. Never use the device timezone for schedule math.
- Timers store absolute timestamps (endAt / flexRunningSince). Never count ticks.
- The dashboard must work offline from localStorage. LDR features may require network but must fail quietly.
- Mobile-first (Poco Android, Chrome). Tap targets >= 44px. No hover-only UI.
- Never expose the Supabase service key to the client. All tables have RLS; keep it that way.
- Palette tokens: sage, matcha, cream, paper, mocha, obsidian, sakura. Rounded-2xl cards. Serif headings.
- Commands: `npm run dev`, `npm run build`, `npx supabase db push`, `npx supabase functions deploy <name>`.
