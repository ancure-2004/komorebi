import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Safe public client initialized ONLY with anon key.
// STRICT INVARIANT: Never expose or use service_role key on the client!
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = "captain" | "her";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
  updated_at?: string;
}

export type MessageType = "text" | "polaroid" | "voice";

export interface Message {
  id: string;
  sender_id: string;
  sender?: string;
  text: string | null;
  body?: string | null;
  type: MessageType;
  kind?: MessageType;
  media_path: string | null;
  mime?: string | null;
  consumed: boolean;
  viewed_at?: string | null;
  expires_at?: string;
  created_at: string;
}

export interface Capsule {
  id: string;
  title: string;
  note_text: string | null;
  body?: string | null;
  photo_path: string | null;
  media_path?: string | null;
  unlock_at: string;
  opened_at: string | null;
  created_at: string;
}

export interface Coupon {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  emoji?: string;
  unlock_streak?: number;
  redeemed_at: string | null;
  created_at: string;
}

export interface UserStatus {
  user_id: string;
  active_block: string | null;
  label?: string | null;
  emoji?: string | null;
  pomodoro_active: boolean;
  pomodoro?: boolean;
  last_seen?: string;
  updated_at?: string;
}

export interface DailyNote {
  date: string;
  body: string | null;
  caption: string | null;
  polaroid_path: string | null;
  updated_at: string;
}

export interface SessionState {
  ready: boolean;
  uid: string | null;
  role: UserRole | null;
  profile: Profile | null;
  email: string | null;
}

/**
 * React hook to listen to current Supabase auth state and profile role.
 * Non-blocking: defaults to unauthenticated if Supabase is offline or unconfigured.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    ready: false,
    uid: null,
    role: null,
    profile: null,
    email: null,
  });

  useEffect(() => {
    let mounted = true;

    async function resolveSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (mounted) {
            setState({
              ready: true,
              uid: null,
              role: null,
              profile: null,
              email: null,
            });
          }
          return;
        }

        const uid = session.user.id;
        const email = session.user.email ?? null;

        // Fetch user profile to determine role
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, display_name, updated_at")
          .eq("id", uid)
          .maybeSingle();

        if (mounted) {
          setState({
            ready: true,
            uid,
            role: (profile?.role as UserRole) ?? null,
            profile: profile ?? null,
            email,
          });
        }
      } catch (err) {
        console.warn("Could not resolve Supabase session:", err);
        if (mounted) {
          setState((s) => ({ ...s, ready: true }));
        }
      }
    }

    resolveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setState({
            ready: true,
            uid: null,
            role: null,
            profile: null,
            email: null,
          });
        } else {
          resolveSession();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
