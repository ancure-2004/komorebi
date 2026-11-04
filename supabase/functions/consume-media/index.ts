import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageRecord {
  id: string;
  sender_id?: string;
  sender?: string;
  media_path: string | null;
  mime?: string | null;
  consumed?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !anonKey || !serviceRoleKey) {
    console.error("Missing server environment variables");
    return new Response(JSON.stringify({ error: "Server configuration missing" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Verify calling user with anon client and forwarded Authorization header
  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await asUser.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: { messageId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { messageId } = body;
  if (!messageId) {
    return new Response(JSON.stringify({ error: "Missing messageId" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Elevated admin client for single-view retrieval and atomic deletion
  const admin = createClient(url, serviceRoleKey);

  let msg: MessageRecord | null = null;
  const { data: msgData } = await admin
    .from("messages")
    .select("id, sender_id, sender, media_path, mime, consumed")
    .eq("id", messageId)
    .single();

  if (msgData) {
    msg = msgData as MessageRecord;
  } else {
    // Check fallback view/table if messages table is empty or aliased
    const { data: chatData } = await admin
      .from("chat_messages")
      .select("id, sender_id, sender, media_path, mime, consumed")
      .eq("id", messageId)
      .single();
    if (chatData) {
      msg = chatData as MessageRecord;
    }
  }

  if (!msg) {
    return new Response(JSON.stringify({ error: "Message not found" }), {
      status: 410,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const senderId = msg.sender_id || msg.sender;
  if (senderId === user.id) {
    // Senders cannot consume their own ephemeral messages
    return new Response(JSON.stringify({ error: "Sender cannot consume own media" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!msg.media_path || msg.consumed) {
    return new Response(JSON.stringify({ error: "Media already vanished" }), {
      status: 410,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const mediaPath = msg.media_path;

  // 1. Download binary from ephemeral storage
  const { data: file, error: downloadError } = await admin.storage
    .from("ephemeral")
    .download(mediaPath);

  if (downloadError || !file) {
    console.error("Storage download error:", downloadError);
    return new Response(JSON.stringify({ error: "Media expired or missing from storage" }), {
      status: 410,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const bytes = await file.arrayBuffer();

  // 2. Immediately delete file from storage bucket (server-enforced single-view)
  const { error: removeError } = await admin.storage
    .from("ephemeral")
    .remove([mediaPath]);

  if (removeError) {
    console.error("Storage delete warning:", removeError);
  }

  // 3. Mark database record as consumed and clear media_path
  const now = new Date().toISOString();
  await admin
    .from("messages")
    .update({
      media_path: null,
      consumed: true,
      viewed_at: now,
    })
    .eq("id", messageId);

  try {
    await admin
      .from("chat_messages")
      .update({
        media_path: null,
        consumed: true,
        viewed_at: now,
      })
      .eq("id", messageId);
  } catch {
    // Ignore view update if chat_messages is read-only view
  }

  const mimeType = msg.mime || "application/octet-stream";

  return new Response(bytes, {
    headers: {
      ...cors,
      "Content-Type": mimeType,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
});
