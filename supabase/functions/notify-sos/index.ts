const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chat = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!token || !chat) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return new Response(JSON.stringify({ error: "Telegram credentials not configured on server" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: "🆘 Komorebi: She tapped SOS. Open the app → /captain → Sanctuary chat.",
      }),
    });

    if (!tgRes.ok) {
      const errText = await tgRes.text();
      console.error("Telegram API error:", errText);
      return new Response(JSON.stringify({ error: "Failed to send Telegram alert", details: errText }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error dispatching SOS notification:", err);
    return new Response(JSON.stringify({ error: "Failed to dispatch SOS alert" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
