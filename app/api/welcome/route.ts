import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WELCOME_ROW_DATE = "2099-01-01";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function GET() {
  try {
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ enabled: false });
    }

    const { data } = await admin
      .from("daily_notes")
      .select("body, caption")
      .eq("date", WELCOME_ROW_DATE)
      .maybeSingle();

    const isEnabled = data?.body === "welcome_her:enabled" || data?.caption === "welcome_her:enabled";
    return NextResponse.json({ enabled: isEnabled });
  } catch (err) {
    console.error("GET /api/welcome error:", err);
    return NextResponse.json({ enabled: false });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const enabled = Boolean(body?.enabled);

    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Missing Supabase configuration" },
        { status: 500 }
      );
    }

    const marker = enabled ? "welcome_her:enabled" : "welcome_her:disabled";
    const { error } = await admin.from("daily_notes").upsert({
      date: WELCOME_ROW_DATE,
      body: marker,
      caption: marker,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, enabled });
  } catch (err) {
    console.error("POST /api/welcome error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
