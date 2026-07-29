import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  applySessionPersistence,
  hasRememberedSession,
} from '@/lib/auth/session-persistence'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next') ?? '/dashboard'
  const newUser = searchParams.get('new_user') === 'true'
  const next =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/dashboard'
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const cookieStore = await cookies()
      applySessionPersistence(
        cookieStore,
        hasRememberedSession(cookieStore)
      )

      if (newUser) {
        const setPasswordUrl = new URL('/set-password', origin)
        setPasswordUrl.searchParams.set('next', next)
        return NextResponse.redirect(setPasswordUrl)
      }

      return NextResponse.redirect(new URL(next, origin))
    }
  }

  const oauthError =
    searchParams.get('error_description') ||
    searchParams.get('error') ||
    'Could not authenticate user'
  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', oauthError)
  return NextResponse.redirect(loginUrl)
}
