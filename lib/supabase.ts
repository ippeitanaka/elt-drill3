import { createClient } from "@supabase/supabase-js"

// Supabase環境変数
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hfanhwznppxngpbjkgno.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW5od3pucHB4bmdwYmprZ25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDc0MDEsImV4cCI6MjA2Nzg4MzQwMX0.38vPdxOHreyEXV41mRUDBZO15Y6R0umyUI1s26W1eDE"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Server-side client for admin operations
export const createServerClient = () => {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW5od3pucHB4bmdwYmprZ25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMwNzQwMSwiZXhwIjoyMDY3ODgzNDAxfQ.A5xIaYlRhjWRv5jT-QdCUB8ThV2u_ufXXnV_o6dZ-a4"

  return createClient(supabaseUrl, serviceRoleKey)
}
