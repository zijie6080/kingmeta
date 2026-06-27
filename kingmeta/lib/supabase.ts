import { createClient, SupabaseClient } from '@supabase/supabase-js'

function makeClient(url: string, key: string, opts = {}) {
  if (!url || !url.startsWith('http')) return null
  try { return createClient(url, key, opts) } catch { return null }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey

export const supabase = makeClient(supabaseUrl, supabaseAnonKey) as SupabaseClient
export const supabaseAdmin = makeClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } }) as SupabaseClient
