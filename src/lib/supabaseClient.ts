import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const missingEnvVars = [
  !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
  !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
].filter((value): value is string => Boolean(value))

if (missingEnvVars.length > 0) {
  console.warn(
    `[supabase] Missing env var(s): ${missingEnvVars.join(', ')}. Auth and remote data sync are disabled; localStorage fallback remains active.`,
  )
}

export const isSupabaseConfigured = missingEnvVars.length === 0

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null
