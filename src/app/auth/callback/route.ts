import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next') ?? '/dashboard'
  const next =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/dashboard'
  const newUser = searchParams.get('new_user') === 'true'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Capture Google tokens if present in the session
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.provider_token) {
        await supabase.from('user_google_tokens').upsert({
          user_id: session.user.id,
          access_token: session.provider_token,
          refresh_token: session.provider_refresh_token || '',
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        }, { onConflict: 'user_id' })
      }

      // For new Google sign-ups, redirect to set-password page
      if (newUser) {
        return NextResponse.redirect(`${origin}/set-password`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
