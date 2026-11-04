# Komorebi - Manual Setup & Deployment Guide for the Captain
*Step-by-step instructions for infrastructure, authentication, and external services*

---

## 1. Supabase Project Setup

1. **Create Project:**
   - Log into [supabase.com](https://supabase.com) and create a new free-tier project named `komorebi`.
   - Choose region `ap-south-1` (Mumbai) for lowest latency to India/IST.
   - Note down the **Project URL** and **Anon public API key** from Project Settings -> API.

2. **Extensions & Database Migration:**
   - In Supabase Dashboard, go to **Database -> Extensions** and ensure `pg_cron` and `pg_net` are enabled.
   - Go to the **SQL Editor** in the Supabase Dashboard.
   - Copy and paste the entire contents of `supabase/migrations/0001_init.sql`.
   - Click **Run** to create tables (`profiles`, `messages`, `daily_notes`, `capsules`, `coupons`, `status`), RLS security policies, `ephemeral` and `daily` storage buckets, and midnight cleanup schedule.

3. **User Accounts & Roles:**
   - Go to **Authentication -> Users** -> click **Add user -> Create user** (toggle Auto-confirm User on).
   - Create User 1 (Her Account): Enter her email and a memorable strong password. Copy the generated User UID.
   - Create User 2 (Captain Account): Enter your email and password. Copy the generated User UID.
   - Go to **Authentication -> Configuration / Providers** -> **Disable "Allow new users to sign up"** (ensures only your 2 accounts can ever log in).
   - In SQL Editor, run this snippet to link roles to your user IDs:
     ```sql
     INSERT INTO profiles (id, role, display_name)
     VALUES 
       ('<HER_USER_UID>', 'her', 'Partner'),
       ('<CAPTAIN_USER_UID>', 'captain', 'Captain');
     ```

4. **Storage Buckets:**
   - In **Storage**, confirm buckets `ephemeral` and `daily` exist and are marked **Private**.
   - `ephemeral` has no public or authenticated SELECT policy - only the `consume-media` Edge Function with the service role key can download and delete single-view media.
   - `daily` allows authenticated members to read (for morning note polaroids and love capsule photos).

5. **Realtime Channels Security:**
   - Go to **Project Settings -> Realtime**.
   - Turn **off** "Allow public access" so that only authorized authenticated members can subscribe to `komorebi:room` and listen to table change publications.

6. **Edge Functions & Secrets:**
   - Install Supabase CLI locally if not already installed: `npx supabase login` and `npx supabase link --project-ref <your-project-ref>`.
   - Set secrets:
     ```bash
     npx supabase secrets set TELEGRAM_BOT_TOKEN="<bot_token>" TELEGRAM_CHAT_ID="<your_chat_id>"
     ```
   - Deploy functions:
     ```bash
     npx supabase functions deploy notify-sos
     npx supabase functions deploy consume-media
     npx supabase functions deploy cleanup
     ```

---

## 2. Telegram Bot for Emergency SOS Alerts

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`, choose a name (e.g. `Komorebi SOS Bot`) and a username (e.g. `komorebi_sos_bot`).
3. Copy the HTTP API token provided by BotFather.
4. Start a chat with your new bot and send any message (e.g. `/start`).
5. Open your browser and visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
6. Look for `"chat":{"id":123456789}` - that number is your `TELEGRAM_CHAT_ID`.
7. Add these two values to Supabase secrets as shown in step 1.6 above.

---

## 3. Local Environment Setup

Create `.env.local` in `projects/komorebi/` (never commit this file):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_CAPTAIN_WA=91XXXXXXXXXX # Your WhatsApp number with country code, no + or spaces
```

---

## 4. Vercel Production Deployment

1. Push this repository to your GitHub account (private repository).
2. Go to [vercel.com](https://vercel.com) and click **Add New -> Project**.
3. Import the repository:
   - If in a monorepo, set **Root Directory** to `projects/komorebi`.
   - Framework Preset: **Next.js**.
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_CAPTAIN_WA`
5. Click **Deploy**.
6. Once deployed, copy your production domain (e.g., `https://komorebi-app.vercel.app`).
7. Go back to **Supabase Dashboard -> Authentication -> URL Configuration**:
   - Set **Site URL** to `https://komorebi-app.vercel.app`.
   - Add `https://komorebi-app.vercel.app/**` to **Redirect URLs**.

---

## 5. Poco Phone Setup Instructions (Send to Her)

1. Open `https://<your-vercel-domain>` in **Google Chrome** (not Mi Browser).
2. Tap the Chrome three-dot menu (⋮) -> tap **"Install app"** or **"Add to Home screen"**.
3. Go to phone **Settings -> Apps -> Manage apps -> Chrome**:
   - Set **Battery saver** to **"No restrictions"** (prevents MIUI/HyperOS from freezing background timers).
   - Turn **Autostart** ON.
4. In phone Settings -> **Display** -> turn **Auto-rotate** ON (enables the horizontal Desk Clock).
5. When prompted in the app, allow **Microphone** and **Camera** for voice notes and Polaroids.
