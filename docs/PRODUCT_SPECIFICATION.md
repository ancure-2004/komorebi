# Komorebi (木漏れ日) - Product Specification & Architecture Blueprint
*Aesthetic Split-Day Timetable, Focus Sanctuary & Long-Distance Relationship Companion*

---

## 1. Executive Summary & Vision

**Komorebi (木漏れ日)** is a dedicated, aesthetic personal study and scheduling web application crafted for the captain's girlfriend. It balances academic rigor with mental well-being, providing clear, stress-free time management while keeping the long-distance relationship vibrant, supportive, and emotionally connected.

### Core Philosophy
1. **Split-Day Flexibility:** Mornings are unpredictable; evenings are structured. Avoid rigid morning hours by tracking flexible banked study time before 3:00 PM, followed by comfortable, predictable preset blocks from 3:00 PM to 11:00 PM.
2. **Guilt-Free Living:** Outside walks (1.5h), dinner (30m), and anime relaxation (1h) are first-class, protected citizens on the schedule, ensuring zero study guilt.
3. **Calm Aesthetics:** Matcha, warm cream, and cozy mocha palettes designed to lower cortisol levels and eliminate visual clutter.
4. **LDR Sanctuary Bridge:** Real-time presence, discreet study whispers, an ephemeral SOS chat, disappearing Polaroids, and synchronized haptic touch bridging the physical distance.

---

## 2. Visual Identity & Design System

* **Theme:** Cozy Matcha & Warm Cream (Sage green `#7D9D8B`, soft matcha `#98B2A0`, warm cream `#FDFBF7`, paper card `#F7F4EE`, mocha dark mode `#1F1E1B`, obsidian card `#2B2925`).
* **Typography:** Clean modern sans-serif paired with a gentle, elegant serif header for a cozy, Japanese-stationery journal feel.
* **Micro-Interactions:** Fluid Framer Motion transitions, soft rounded cards (`rounded-2xl`), gentle glows, and particle celebrations upon goal completion.
* **Responsiveness:** Mobile-first PWA (Progressive Web App) layout designed for one-handed thumb interaction on mobile devices, with a dedicated horizontal "Desk Clock" mode.

---

## 3. Daily Routine & Time Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 1: MORNING FLEX BANK (< 3:00 PM)                 │
│  - Flexible Goal Slider (Default: 2.0 Hours)                                │
│  - Focus Stopwatch & Quick-Log (+15m, +30m, +45m, +1h)                      │
│  - Radial Progress Ring & Banked Hours Tracker                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼ 3:00 PM Transition
┌─────────────────────────────────────────────────────────────────────────────┐
│                   PHASE 2: EVENING FLOW TIMELINE (3:00 PM - 11:00 PM)       │
│  3:00 PM - 5:00 PM  │  Deep Focus Study Session 1 (2h) 📚                   │
│  5:00 PM - 6:30 PM  │  Outside Walk & Golden Hour Fresh Air (1.5h) 🌿        │
│  6:30 PM - 8:30 PM  │  Deep Focus Study Session 2 (2h) 📖                   │
│  8:30 PM - 9:00 PM  │  Dinner & Rest (30m) 🍱                               │
│  9:00 PM - 10:00 PM │  Evening Study Wrap-Up (1h) ✍️                        │
│ 10:00 PM - 11:00 PM │  Anime Wind Down & Snack (1h) 🍿                       │
│ 11:00 PM            │  Day Reflection, Sleep Prep & Memory Reel 🌙          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Schedule Controls & Modifiers
* **Drag-and-Drop Reordering:** Full freedom to rearrange blocks, modify durations, or create custom blocks.
* **Quick Bump Button (`+15m / +30m Shift`):** Smoothly offsets remaining evening blocks forward when an outing or session runs long, without manual recalculation.
* **Low Energy / Recovery Day (1-Tap Toggle):** Halves evening study expectations (5h -> 2.5h) and expands relaxation for stressful or tiring days, preserving consistency without burnout.

---

## 4. Key Functional Modules

### A. Focus & Productivity Engine
1. **"Right Now & Up Next" Hero Widget:** Prominent top card showing current active task, countdown progress bar, and immediate preview of the next block.
2. **Dual-View Canvas:**
   * *Timeline River Mode:* Vertical scrollable day feed with glowing active task aura and past task dimming.
   * *Sunburst Radial Mode:* 24-hour circular daylight ring illustrating the daily cycle.
3. **Integrated Pomodoro System:**
   * Presets: `25m / 5m` (Classic), `50m / 10m` (Deep Work), and Custom duration.
   * Auto-links with active schedule block.
   * Full-Screen Zen Focus Mode with gentle breathing animation.
   * Desk Clock / Flip Display Mode when phone is rotated horizontally.
4. **Built-in Ambient Soundscape:**
   * Synthesized offline audio generators powered by the Web Audio API (Rain on window, cozy lofi warmth, forest breeze, white noise, and gentle end-of-block chime).
5. **Anti-Distraction "Brain Dump" Pad:** Quick floating slide-out drawer to jot down intrusive thoughts without breaking study momentum.
6. **20-20-20 Break Nudge:** Animated 20-second eye-rest and shoulder-stretch guide during Pomodoro breaks.

### B. Gamification & Visual Growth
1. **Komorebi Bonsai:** Potted digital plant that sprouts leaves with each finished focus block and blossoms into cherry petals when the full day goal is met.
2. **Monthly Matcha Consistency Heatmap:** GitHub-style grid visualizing daily focus achievement.
3. **Milestone Love Coupons:** Unlocks digital vouchers from the captain (e.g. Boba date, ice cream run, homemade dinner) upon reaching study streaks.
4. **End-of-Day Reflection & Memory Reel:** 3-emoji daily mood check-in with a 1-tap summary export to WhatsApp and downloadable daily story card.

---

## 5. Long-Distance Relationship (LDR) Sanctuary System

### A. Captain's Private Admin Portal (`/captain?key=secret`)
* **Secure Access:** Bookmarked on the captain's phone/laptop.
* **Live Telemetry:** Real-time visibility into her active schedule state (e.g., *"Studying Block 2 📚"*, *"Outside Walk 🌿"*, *"Pomodoro Active"*).
* **Remote Note & Surprise Dispatcher:**
  * Edit the **Daily Morning Love Note**.
  * Attach a **Tap-to-Flip Polaroid Photo** for her morning greeting.
  * Schedule **Time-Locked Love Capsules** (surprises opening at exact timetable intervals).
  * Send **Floating Hug / Coffee Drops** that float across her screen in real-time.

### B. The SOS Sanctuary Chat
When she feels overwhelmed or isolated, tapping the discreet **SOS Button** alerts the captain and opens a dedicated private chatroom:
1. **Disappearing Polaroids:** Selfies appear in a retro Polaroid frame with a developing animation. Once viewed, they disappear permanently.
2. **One-Time Ephemeral Voice Notes:** Play-once audio clips that expire immediately after listening.
3. **24-Hour Auto-Reset Encrypted Text:** Messages clear automatically at midnight for a fresh daily slate.
4. **Sync Touch:** When both hold the glowing orb simultaneously, both devices pulse with synchronized haptic ripples across the miles.
5. **Study Whisper:** The captain can send silent, non-intrusive glowing ribbon messages that dissolve after 5 seconds without buzzing or demanding a reply.

---

## 6. Real-Time Chat & WebSocket Architecture

To deliver zero-latency messaging, synchronized haptic touch, and disappearing media without the operational overhead and server cost of maintaining a 24/7 Socket.io Node.js server on a VPS, **Komorebi** implements a serverless real-time architecture utilizing **Supabase Realtime WebSockets**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          KOMOREBI CLIENTS (Vercel PWA)                          │
│        [ Her Phone: Study Dashboard ]         [ Your Phone: Captain Portal ]    │
└───────────────────────┬─────────────────────────────────┬───────────────────────┘
                        │                                 │
     Pure In-Memory     │                                 │   Database Backed
     WebSockets (<50ms) │                                 │   Change-Data-Capture
                        ▼                                 ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│   SUPABASE REALTIME BROADCAST   │             │   POSTGRES CDC REALTIME CHAT    │
│  - "Sync Touch" Haptic Pulse    │             │  - End-to-End Encrypted Chat    │
│  - "Study Whisper" Ribbon       │             │  - 24-Hour Auto-Purge (pg_cron) │
│  - Live Status Telemetry        │             │  - Zero Permanent Storage       │
└─────────────────────────────────┘             └─────────────────────────────────┘
                        │                                 │
                        └────────────────┬────────────────┘
                                         ▼
                        ┌─────────────────────────────────┐
                        │    EPHEMERAL MEDIA BUCKET       │
                        │  - Disappearing Polaroids       │
                        │  - One-Time Voice Notes         │
                        │  - Immediate Self-Destruct      │
                        │    upon view / 24h hard expiry  │
                        └─────────────────────────────────┘
```

### Detailed Channel Mechanics
1. **Real-time Broadcast Channels (Zero-Database Sockets):**
   * **Sync Touch:** When both users touch the screen simultaneously, touch events broadcast directly over WebSockets in memory. Latency is ultra-low (<50ms) with zero database read/writes.
   * **Study Whispers:** Silent text ribbons beam directly into her active study session without creating database records or ringing notifications.
   * **Live Telemetry:** The captain's portal receives instant updates on active Pomodoro state and current schedule blocks.
2. **Ephemeral 24h Sanctuary Chat:**
   * Messages are transmitted via Supabase Realtime `postgres_changes`.
   * Stored with a strict 24-hour Time-To-Live (TTL); an automated midnight database routine (`pg_cron`) wipes all conversation logs for a completely fresh daily slate.
3. **Disappearing Media Protocol:**
   * Polaroids (selfies) and voice notes are uploaded with signed one-time view tokens.
   * As soon as the recipient opens the Polaroid or plays the voice note, the client dispatches an immediate delete mutation to purge the binary from storage. If unviewed, items automatically expire after 24 hours.

---

## 7. Technical Architecture & Tech Stack

* **Frontend Framework:** Next.js 16 (App Router), React 19, TypeScript
* **Styling & Motion:** Tailwind CSS v3, Framer Motion (micro-interactions, flip animations, particle effects), Lucide Icons
* **Audio Engine:** Web Audio API (Offline native synthesizer for rain, lofi warmth, and chimes)
* **Real-time & Sync:** Supabase Realtime (WebSockets Broadcast + CDC)
* **Local Persistence:** LocalStorage for 100% offline-first reliability (schedules, settings, and timers survive zero connectivity)
* **Deployment:** Vercel with Progressive Web App (PWA) manifest for standalone mobile home-screen install

---

## 8. Delivery Milestones

1. **Sprint 1: Core Foundation & UI Shell**
   - Project initialization under `projects/komorebi`.
   - Theme configuration (Matcha, Cream, Mocha dark mode).
   - Morning Flex Bank + Evening Flow Timeline rendering with local storage persistence.
2. **Sprint 2: Focus & Ambient Engine**
   - Pomodoro timer with Zen Mode and horizontal Desk Clock layout.
   - Web Audio API ambient soundscapes and end-of-block chimes.
   - Schedule modification (drag-drop, quick +15m shift, Low Energy Mode).
3. **Sprint 3: LDR Bridge & Captain Portal**
   - Cloud sync integration for remote notes and live telemetry.
   - Captain's private portal (`/captain`).
   - Morning envelope with tap-to-flip Polaroid and time-locked capsules.
4. **Sprint 4: SOS Sanctuary Chat & Interactive Details**
   - Ephemeral chat modal with one-time voice notes and disappearing Polaroids.
   - Sync Touch haptic integration and floating Study Whispers.
   - Komorebi Bonsai plant growth and Monthly Matcha Heatmap.
