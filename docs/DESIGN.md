# Komorebi (木漏れ日) - Design System & UI Specification
*Design Intelligence generated via UI UX Pro Max Skill*

---

## 1. Visual Foundation & Color Tokens

### Fixed Palette Tokens (Spec §2)
| Token | Hex Value | Semantic Role (Light) | Semantic Role (Dark) |
| :--- | :--- | :--- | :--- |
| `sage` | `#7D9D8B` | Primary brand, accent borders, pills, icons | Primary accent, rings, glow effects |
| `matcha` | `#98B2A0` | Active states, hover fills, secondary indicators | Secondary accent, progress fills |
| `cream` | `#FDFBF7` | Page background (`bg-cream`) | High-contrast text on dark (`text-cream`) |
| `paper` | `#F7F4EE` | Card & surface background (`bg-paper`) | Muted surface tint |
| `mocha` | `#1F1E1B` | High-contrast text on light (`text-mocha`) | Page background (`bg-mocha`) |
| `obsidian`| `#2B2925` | Dark mode surface borders | Dark card & surface background (`bg-obsidian`) |
| `ink` | `#3A3833` | Primary readable body text on cream/paper | Secondary text in dark mode |
| `sakura` | `#F4C2C8` | Romantic accent, heart pulses, streak milestones | Soft pink accent & alerts |

### Contrast & WCAG AA Strict Enforcement
* **Critical Contrast Note:** Pure sage (`#7D9D8B`) on cream (`#FDFBF7`) yields a contrast ratio of **2.73:1**, failing WCAG AA (4.5:1) for standard body copy.
* **Resolution Rule:**
  - On light backgrounds (`cream`, `paper`), all readable text MUST use `text-ink` (`#3A3833`, contrast **9.4:1**) or deep sage `text-[#2D5A43]` (contrast **5.8:1**).
  - Sage (`#7D9D8B`) is strictly for UI component borders, decorative accents, button background fills (with `text-cream` or `text-mocha` text), and large headers >= 18pt bold.
  - In dark mode (`mocha`, `obsidian`), body text MUST use `text-cream` (`#FDFBF7`, contrast **13.2:1**) or muted matcha `text-[#B4CEBC]` (contrast **7.1:1**).

---

## 2. Typography System & Type Scale

* **Headings & Accents:** `Cormorant Garamond` (`var(--font-serif)`), weights 500, 600. Evokes a refined, Japanese stationery aesthetic.
* **Body, Numerals & UI:** `Inter` (`var(--font-sans)`), weights 400, 500, 600. Clean, legible legibility on mobile screens at small sizes.
* **Japanese Characters:** System CJK fallback (`"Hiragino Sans", "Yu Gothic", sans-serif`) for the title glyphs (木漏れ日).

| Style | Font Family | Size / Line-Height | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- | :--- |
| Hero Display | Serif | 28px / 36px | `font-serif text-2xl sm:text-3xl font-semibold` | Page title, big countdown |
| Section Title| Serif | 20px / 28px | `font-serif text-xl font-medium` | Card headers, modal titles |
| Subhead | Sans | 15px / 22px | `font-sans text-sm font-semibold tracking-wide` | Block names, category labels |
| Body Text | Sans | 14px / 20px | `font-sans text-sm font-normal` | Descriptions, captions |
| Micro / Meta | Sans | 12px / 16px | `font-sans text-xs font-medium` | Timestamps, tags, badges |
| Large Clock | Sans (Tabular) | 48px / 52px | `font-sans text-5xl font-bold tabular-nums tracking-tight` | Pomodoro & Desk Clock |

---

## 3. Layout, Viewport & Mobile Geometry

* **Target Device:** Poco Android phone running Google Chrome (viewport range: **360px - 412px** width).
* **One-Handed Thumb Reach:**
  - High-frequency interactive controls (Start/Pause timer, +15m bump, Quick-log, Navigation) reside in the bottom 40% of the screen.
  - Informational elements (Hero widget, streaks, current time) occupy the top area.
* **Safe Area Insets:**
  - Root container applies `pb-[calc(4.5rem+env(safe-area-inset-bottom))]` to clear the fixed bottom navigation bar and Android gesture pill.
  - Class `.safe` handles `env(safe-area-inset-bottom)`.
* **Touch Targets:**
  - Absolute minimum touch target size: **44px × 44px** (Android standard minimum 48dp recommended).
  - Minimum gap between adjacent interactive targets: **8px** (`gap-2`).

---

## 4. Component Patterns

### A. Surface Cards
* Standard Card: `rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-4 shadow-sm transition-colors duration-200`
* Active / Hero Card: `rounded-2xl bg-paper dark:bg-obsidian border-2 border-sage/60 dark:border-matcha/60 p-4 shadow-aura`

### B. Buttons & Interactive Controls
* Primary Action: `h-11 px-5 rounded-xl bg-sage text-cream font-medium shadow-sm active:scale-95 transition-all duration-150 flex items-center justify-center gap-2`
* Secondary / Soft Action: `h-11 px-4 rounded-xl bg-sage/10 dark:bg-sage/20 text-sage dark:text-matcha font-medium active:scale-95 transition-all duration-150`
* Icon Button: `w-11 h-11 rounded-xl flex items-center justify-center text-ink dark:text-cream hover:bg-sage/10 active:scale-90 transition-all duration-150`
* Quick Log Pill (`+15m`, `+30m`): `h-9 px-3 rounded-lg bg-paper dark:bg-obsidian border border-sage/30 text-xs font-medium tabular-nums active:scale-95 transition-all`

### C. Bottom Navigation Bar
* Fixed layout: `fixed bottom-0 inset-x-0 z-40 bg-cream/90 dark:bg-mocha/90 backdrop-blur-md border-t border-[#EBE7DF] dark:border-[#383530] pb-[env(safe-area-inset-bottom)]`
* Max 5 tabs:
  1. **Flow** (`CalendarClock` icon) - Split-day timeline & hero view
  2. **Focus** (`Timer` icon) - Pomodoro & ambient soundscapes
  3. **Growth** (`Sprout` icon) - Bonsai, streaks & heatmap
  4. **Sanctuary** (`HeartHandshake` icon) - LDR bridge, chat & whispers
  5. **Settings** (`Settings2` icon) - Theme, preferences, account
* Tab item: `min-h-[52px] min-w-[56px] flex flex-col items-center justify-center text-xs gap-1 active:scale-95 transition-all`

### D. Bottom Sheet / Modal Drawer
* Framer Motion spring-damped slide-up: `fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-paper dark:bg-obsidian border-t border-sage/30 p-6 pb-8 shadow-2xl`
* Backdrop: `fixed inset-0 z-40 bg-mocha/40 dark:bg-black/60 backdrop-blur-sm`

---

## 5. Motion & Animation Standards

* **Framer Motion Presets:**
  - Smooth Spring: `type: "spring", stiffness: 350, damping: 30`
  - Gentle Ease: `duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0]`
* **Prefers-Reduced-Motion:**
  - Wrap animations with check for reduced motion or use `motion.div` with fallback transitions (`duration: 0.01` when active).
* **Zen & Desk Clock Breathing:**
  - Gentle opacity and scale oscillation: `scale: [1, 1.03, 1], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }`
* **Goal Met Confetti:**
  - Native `canvas-confetti` trigger with custom pastel colors: `["#7D9D8B", "#98B2A0", "#F4C2C8", "#FDFBF7"]`.

---

## 6. Iconography Rules

* **Lucide React Icons ONLY** for all application UI controls, buttons, statuses, and tabs.
* **Emoji Usage Constraint:** Strictly limited to schedule block visual markers (e.g., 📚, 🌿, 📖, 🍱, ✍️, 🍿, 🌙) as explicitly defined in spec §3. No emojis as standalone UI action buttons.
* Default icon stroke width: `2px` (`strokeWidth={2}`).

---

## 7. Screen & View Inventory

1. **Screen 1: Dashboard Flow (`/`)**
   - Morning Envelope Banner (with tap-to-flip Polaroid & love note)
   - "Right Now & Up Next" Hero Widget
   - View Toggle: Timeline River vs. 24h Sunburst Ring
   - Morning Flex Bank (< 3:00 PM) slider & stopwatch
   - Evening Flow Timeline (3:00 PM - 11:00 PM) with quick bump (`+15m`) and Low Energy toggle
2. **Screen 2: Focus & Sound (`?tab=focus`)**
   - Full Pomodoro Engine (25/5, 50/10, Custom)
   - Full-Screen Zen Focus Mode trigger
   - Soundscape Selector (Rain, Lofi Warmth, Forest, White Noise, Chime)
   - 20-20-20 Break Stretch Guide & Brain Dump Scratchpad
3. **Screen 3: Growth & Reflection (`?tab=growth`)**
   - Komorebi Bonsai interactive digital plant
   - 30-Day Monthly Matcha Heatmap
   - Love Coupon Vault (redeemable vouchers)
   - 11:00 PM End-of-Day Reflection & WhatsApp Story Card generator
4. **Screen 4: LDR Sanctuary (`?tab=sanctuary`)**
   - Live Presence Telemetry ("He is working / cheering for you")
   - Time-Locked Love Capsules
   - SOS Sanctuary Button -> Ephemeral Chat Modal
   - Disappearing Polaroids & Voice Notes viewer
   - Sync Touch Orb
5. **Screen 5: Captain Portal (`/captain`)**
   - Live Her-Side Telemetry status monitor
   - Morning Note Editor + Polaroid photo attachment
   - Time-Locked Capsule creator & scheduler
   - Study Whisper & Floating Drop sender
   - Coupon management & active SOS alert banner
