import { createClient, SupabaseClient } from "@supabase/supabase-js"

let browserClient: SupabaseClient | null = null

export const getSupabaseClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Supabase client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  if (!browserClient) {
    browserClient = createClient(url, anon, { realtime: { params: { eventsPerSecond: 10 } } })
  }
  return browserClient
}

export const createServerClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) {
    throw new Error('Server Supabase client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, service)
}

// 互換性のためのダミーエクスポート（旧コードが参照しても直ちに初期化しない）
export const supabase = undefined as unknown as SupabaseClient
