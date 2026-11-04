import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { supabase } from "@/lib/supabase";
import { send } from "@/lib/room";
import { consumeMedia, getSignedDailyUrl } from "@/lib/media";

describe("Supabase Client Configuration (lib/supabase.ts)", () => {
  it("initializes supabase client instance with public anon configuration", () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe("function");
    expect(typeof supabase.channel).toBe("function");
    expect(typeof supabase.auth.getSession).toBe("function");
  });

  it("verifies service_role key is never bundled or present in public client code", () => {
    const clientCode = readFileSync(resolve(__dirname, "../lib/supabase.ts"), "utf-8");
    expect(clientCode).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(clientCode).not.toContain("serviceRoleKey");
  });
});

describe("Realtime Room Mechanics (lib/room.ts)", () => {
  it("send helper safely handles null channel", async () => {
    const res = await send(null, "whisper", { text: "hello" });
    expect(res).toBeNull();
  });
});

describe("Media Helpers (lib/media.ts)", () => {
  it("exports all expected client media functions", () => {
    expect(typeof consumeMedia).toBe("function");
    expect(typeof getSignedDailyUrl).toBe("function");
  });
});

describe("Database Migration Verification (supabase/migrations/0001_init.sql)", () => {
  const sqlPath = resolve(__dirname, "../supabase/migrations/0001_init.sql");

  it("migration file exists on disk", () => {
    expect(existsSync(sqlPath)).toBe(true);
  });

  it("contains all required tables with RLS enabled", () => {
    const sql = readFileSync(sqlPath, "utf-8");

    // Tables required by spec & prompt
    expect(sql).toContain("create table if not exists public.profiles");
    expect(sql).toContain("create table if not exists public.messages");
    expect(sql).toContain("create table if not exists public.daily_notes");
    expect(sql).toContain("create table if not exists public.capsules");
    expect(sql).toContain("create table if not exists public.coupons");
    expect(sql).toContain("create table if not exists public.status");

    // Row Level Security on all tables
    expect(sql).toContain("alter table public.profiles enable row level security");
    expect(sql).toContain("alter table public.messages enable row level security");
    expect(sql).toContain("alter table public.daily_notes enable row level security");
    expect(sql).toContain("alter table public.capsules enable row level security");
    expect(sql).toContain("alter table public.coupons enable row level security");
    expect(sql).toContain("alter table public.status enable row level security");

    // Storage buckets
    expect(sql).toContain("'ephemeral'");
    expect(sql).toContain("'daily'");

    // pg_cron scheduled midnight IST cleanup (18:30 UTC)
    expect(sql).toContain("30 18 * * *");
    expect(sql).toContain("komorebi-midnight-cleanup");
  });
});

describe("Supabase Edge Functions Verification", () => {
  it("verifies all three edge function entry points exist", () => {
    const sosPath = resolve(__dirname, "../supabase/functions/notify-sos/index.ts");
    const consumePath = resolve(__dirname, "../supabase/functions/consume-media/index.ts");
    const cleanupPath = resolve(__dirname, "../supabase/functions/cleanup/index.ts");

    expect(existsSync(sosPath)).toBe(true);
    expect(existsSync(consumePath)).toBe(true);
    expect(existsSync(cleanupPath)).toBe(true);

    const sosCode = readFileSync(sosPath, "utf-8");
    expect(sosCode).toContain("TELEGRAM_BOT_TOKEN");
    expect(sosCode).toContain("TELEGRAM_CHAT_ID");

    const consumeCode = readFileSync(consumePath, "utf-8");
    expect(consumeCode).toContain("ephemeral");
    expect(consumeCode).toContain("messageId");
    expect(consumeCode).toContain("viewed_at");

    const cleanupCode = readFileSync(cleanupPath, "utf-8");
    expect(cleanupCode).toContain("mode");
    expect(cleanupCode).toContain("ephemeral");
  });
});
