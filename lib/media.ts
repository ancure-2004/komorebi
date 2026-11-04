import { supabase } from "./supabase";

/**
 * Resizes and crops any uploaded photo to a square JPEG suitable for
 * retro Polaroid frames. Performed locally in-browser via Canvas.
 */
export async function toSquareJpeg(file: Blob, size = 720, q = 0.8): Promise<Blob> {
  if (typeof window === "undefined") {
    return file;
  }

  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas 2D rendering context");
  }

  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to encode canvas to JPEG blob"));
      },
      "image/jpeg",
      q
    );
  });
}

/**
 * Uploads an ephemeral media binary (Polaroid photo or voice note) into the
 * private 'ephemeral' storage bucket and records it in the messages table.
 */
export async function sendMedia(
  type: "polaroid" | "voice",
  blob: Blob,
  mime: string,
  text?: string,
  customId?: string
): Promise<{ id: string; media_path: string }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User must be authenticated to upload media");
  }

  const ext = mime.includes("webp")
    ? "webp"
    : mime.includes("webm")
    ? "webm"
    : mime.includes("mp4")
    ? "mp4"
    : "jpg";

  const messageId = customId || crypto.randomUUID();
  const mediaPath = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("ephemeral")
    .upload(mediaPath, blob, {
      contentType: mime,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      id: messageId,
      sender_id: user.id,
      sender: user.id,
      type,
      kind: type,
      text: text ?? null,
      body: text ?? null,
      media_path: mediaPath,
      mime,
      consumed: false,
    })
    .select("id, media_path")
    .single();

  if (insertError || !message) {
    // Attempt rollback of uploaded file if metadata insert fails
    await supabase.storage.from("ephemeral").remove([mediaPath]);
    throw insertError || new Error("Failed to create message record");
  }

  return { id: message.id, media_path: message.media_path };
}

/**
 * Requests the single-view media binary from the Next.js server route or Edge Function.
 * Downloads the binary, immediately deletes it from storage/ephemeral on the server,
 * updates the database, and streams the bytes back.
 */
export async function consumeMedia(
  messageId: string
): Promise<{ blob: Blob | null; url: string | null; error: Error | null }> {
  try {
    // 1. Try local server-side API route first (runs with SUPABASE_SERVICE_ROLE_KEY)
    try {
      const res = await fetch("/api/consume-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });

      if (res.status === 200) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        return { blob, url, error: null };
      } else if (res.status === 410) {
        return {
          blob: null,
          url: null,
          error: new Error("This media has already vanished."),
        };
      }
    } catch {
      // Fall through to edge function if local route is unreachable
    }

    // 2. Fallback to Supabase edge function
    const { data, error } = await supabase.functions.invoke("consume-media", {
      body: { messageId },
    });

    if (error) {
      return {
        blob: null,
        url: null,
        error: new Error(error.message || "Failed to consume ephemeral media"),
      };
    }

    if (!data || !(data instanceof Blob)) {
      return {
        blob: null,
        url: null,
        error: new Error("Media is no longer available"),
      };
    }

    const url = URL.createObjectURL(data);
    return { blob: data, url, error: null };
  } catch (err) {
    return {
      blob: null,
      url: null,
      error: err instanceof Error ? err : new Error("Unknown error consuming media"),
    };
  }
}

/**
 * Uploads the captain's morning Polaroid photo to the daily bucket.
 */
export async function uploadDailyPolaroid(
  date: string,
  blob: Blob
): Promise<{ path: string }> {
  const path = `${date}/polaroid.jpg`;
  const { error } = await supabase.storage.from("daily").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return { path };
}

/**
 * Uploads an optional surprise photo for a time-locked love capsule.
 */
export async function uploadCapsulePhoto(
  capsuleId: string,
  blob: Blob
): Promise<{ path: string }> {
  const path = `capsules/${capsuleId}.jpg`;
  const { error } = await supabase.storage.from("daily").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return { path };
}

/**
 * Generates a temporary signed URL to view assets in the private 'daily' bucket.
 */
export async function getSignedDailyUrl(
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage.from("daily").createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
