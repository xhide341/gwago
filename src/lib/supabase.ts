import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = process.env.SUPABASE_URL || "";
export const supabaseKey = process.env.SUPABASE_SECRET_KEY || "";

export const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder-url.supabase.co",
  supabaseKey || "placeholder-service-key",
);
