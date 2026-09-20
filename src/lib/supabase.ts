import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = rawUrl ? rawUrl.trim().replace(/\/+$/, "") : "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim() : "";

// Check if environment variables are configured and are not the default placeholders
const isConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== "https://your-supabase-project-ref.supabase.co" && 
  supabaseAnonKey !== "your-supabase-public-anon-key";

if (!isConfigured) {
  console.warn(
    "%c[Supabase Config Warning] %cSupabase URL or Anon Key is missing or set to placeholder defaults.\n" +
    "To enable backend history features, copy '.env.example' to '.env' and set your custom credentials.",
    "color: #f59e0b; font-weight: bold; font-size: 13px;",
    "color: inherit; font-size: 12px;"
  );
}

// Safely initialize with dummy values if missing to prevent startup crash,
// allowing the rest of the application to run successfully.
export const supabase = createClient(
  supabaseUrl || "https://placeholder-project.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

export const isSupabaseConfigured = isConfigured;

