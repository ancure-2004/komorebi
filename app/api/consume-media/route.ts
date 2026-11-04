import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messageId = body?.messageId;

    if (!messageId || typeof messageId !== "string") {
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server missing Supabase credentials" },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    // 1. Fetch message record
    const { data: msg, error: fetchErr } = await admin
      .from("messages")
      .select("id, sender_id, sender, media_path, mime, consumed")
      .eq("id", messageId)
      .single();

    if (fetchErr || !msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 410 });
    }

    if (msg.consumed || !msg.media_path) {
      return NextResponse.json({ error: "Media already vanished" }, { status: 410 });
    }

    const mediaPath = msg.media_path;

    // 2. Download binary from private ephemeral storage
    const { data: file, error: downloadErr } = await admin.storage
      .from("ephemeral")
      .download(mediaPath);

    if (downloadErr || !file) {
      // Mark as consumed so it doesn't linger
      await admin
        .from("messages")
        .update({
          consumed: true,
          media_path: null,
          viewed_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      return NextResponse.json(
        { error: "Media expired or missing from storage" },
        { status: 410 }
      );
    }

    const buffer = await file.arrayBuffer();

    // 3. Delete from private storage bucket (atomic single-view guarantee)
    await admin.storage.from("ephemeral").remove([mediaPath]);

    // 4. Update database record to consumed and clear media_path
    await admin
      .from("messages")
      .update({
        consumed: true,
        media_path: null,
        viewed_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    const contentType = msg.mime || "application/octet-stream";

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (err: unknown) {
    console.error("consume-media error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
