// Ambient type definitions for Supabase Deno Edge Functions
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

declare module "npm:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}
