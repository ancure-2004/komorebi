# Komorebi (木漏れ日)

A modern, mobile-first Progressive Web Application (PWA) built for daily study scheduling, Pomodoro time tracking, ambient focus environments, and real-time companion telemetry.

Designed with an intentional Japanese aesthetic (Wabi-Sabi), Komorebi balances rigorous academic productivity with gentle, supportive ergonomic care.

---

## Overview & Architecture

Komorebi is structured into five core modules:

1. **Daily Flow & Timetable:** Structured daily schedule timeline, dynamic block allocation, 24-hour circular sunburst visualization, and morning flex banks with automatic progress calculation.
2. **Focus Engine:** Pomodoro timer with configurable intervals, distraction-free fullscreen Zen immersion mode with guided breathing pacing, digital desk clock, and ambient background soundscapes (Rain, Lo-Fi, Forest, White Noise, Ambient Cafe).
3. **Ergonomic Care & Habit Growth:** Automated 20-20-20 eye strain stretch alerts, quick-capture scratchpads, and a gamified Bonsai plant habit visualizer that flourishes with completed study blocks.
4. **Sanctuary Bridge & Telemetry:** Low-latency bidirectional WebSocket connection powered by Supabase Realtime, enabling real-time presence, study status synchronization, quick care drops, and high-priority emergency notifications.
5. **Ephemeral Single-View Media:** Time-decaying text notes, single-view photo capture with in-browser retro developing shaders and Thanos-style particle disintegration, and single-play frequency-reactive voice notes backed by atomic serverless storage deletion.

---

## Key Features

### 📅 Daily Flow & Schedule Management
- **River Timeline:** Vertical timeline tracking active, completed, and upcoming subject blocks throughout the day.
- **Sunburst 24-Hour View:** Interactive circular clock mapping blocks continuously across the 24-hour cycle.
- **Morning Flex Bank:** Flexible study interval tracking (target: 2.5 hours) with automatic cutoff at 15:00 IST.
- **Timezone Invariant:** All schedule routines and milestone calculations operate strictly in Indian Standard Time (IST / `Asia/Kolkata`), independent of client device clock drifts.

### ⏱️ Focus & Ergonomics
- **Pomodoro Engine:** Flexible interval presets (25/5, 50/10, 90/15, 120/20) with automated block attribution.
- **Fullscreen Zen Mode:** Minimalist breathing sphere with 8-second pacing and wake-lock to prevent screen sleep.
- **Ambient Soundscapes:** Multi-track synthesized audio engine with volume controls and completion chimes.
- **20-20-20 Rest Prompts:** Periodic non-intrusive modal reminding users to look 20 feet away for 20 seconds.

### 📡 Real-Time Companion Bridge
- **Study Status Synchronization:** Transmits active study block, Pomodoro phase, and study streaks over private Realtime channels without location tracking or surveillance.
- **Quick Care Drops & Whispers:** Immediate peer dispatch for supportive reminders and study encouragement.
- **Live Sync Touch:** Real-time mutual touch synchronization with tactile haptic and visual heartbeat resonance.
- **Emergency SOS:** Direct distress protocol triggering high-priority alarms and alerting integrations.

### 🔒 Single-View Ephemeral Messaging
- **Atomic Single-View:** Photos and audio notes are downloaded once and immediately destroyed from cloud storage via a serverless execution route.
- **In-App Camera Capture:** In-browser square viewfinder with camera switching, retro developing simulation, and 30-second disintegration decay.
- **Voice Visualizer:** Web Audio API frequency-reactive waveform analyzer with automated single-play expiry.
- **Nightly Vault Purge:** Ephemeral chat messages and daily interactions are automatically purged at midnight IST.

---

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Runtime & UI:** React 19, TypeScript
- **Styling:** Tailwind CSS, Framer Motion
- **Icons:** Lucide React
- **State Management:** Zustand with client-side LocalStorage hydration
- **Backend & Realtime:** Supabase (Auth, PostgreSQL with Row Level Security, Realtime WebSockets, Storage)
- **Deployment:** Vercel (Edge & Serverless Node.js Runtime)

---

## Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm, pnpm, or yarn
- Supabase project credentials

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ancure-2004/komorebi.git
   cd komorebi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   NEXT_PUBLIC_CAPTAIN_WA=your-contact-phone-number
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

5. **Run tests and linting:**
   ```bash
   npm run lint
   npm test
   ```

---

## Security & Data Privacy

- **Row Level Security (RLS):** Enforced across all PostgreSQL tables (`profiles`, `messages`, `daily_notes`, `capsules`, `coupons`, `status`).
- **Private Storage:** Media uploads are contained in private storage buckets with strict server-side access controls.
- **Key Isolation:** The `SUPABASE_SERVICE_ROLE_KEY` is restricted solely to server-side API handlers (`app/api/consume-media/route.ts`) and is never packaged or transmitted to the client application.
- **Offline Reliability:** Core timetable and timer mechanics operate entirely offline via LocalStorage; network connectivity is only required for companion synchronization.

---

## License

This project is licensed under the MIT License.
