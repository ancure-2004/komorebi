import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CleanupRow {
  id: string;
  media_path: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server credentials missing" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const mode = new URL(req.url).searchParams.get("mode") ?? "expired";
  const admin = createClient(url, serviceRoleKey);

  let q = admin.from("messages").select("id, media_path");
  if (mode !== "all") {
    // Expired mode: rows older than 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    q = q.lt("created_at", cutoff);
  }

  const { data: rows, error: qError } = await q;
  if (qError) {
    console.error("Cleanup query error on messages:", qError);
  }

  const messageRows = (rows ?? []) as CleanupRow[];
  const paths = messageRows.map((r) => r.media_path).filter(Boolean) as string[];

  // 1. Remove storage binaries via Storage API
  if (paths.length > 0) {
    const { error: storageError } = await admin.storage.from("ephemeral").remove(paths);
    if (storageError) {
      console.error("Error purging ephemeral files:", storageError);
    }
  }

  // 2. Delete database records
  const ids = messageRows.map((r) => r.id);
  if (ids.length > 0) {
    const { error: delError } = await admin.from("messages").delete().in("id", ids);
    if (delError) {
      console.error("Error deleting message rows:", delError);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      mode,
      removedMessages: ids.length,
      removedFiles: paths.length,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { ...cors, "Content-Type": "application/json" },
    }
  );
});
