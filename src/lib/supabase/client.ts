import { createBrowserClient } from '@supabase/ssr'

function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

let browserClient: ReturnType<typeof createBrowserSupabaseClient> | undefined

export function createClient() {
  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserSupabaseClient()

  return browserClient
}
