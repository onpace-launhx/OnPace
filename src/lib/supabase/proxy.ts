import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { REMEMBER_SESSION_COOKIE } from '@/lib/auth/remember-session'
import { hasActiveFocusEntitlement } from '@/lib/entitlements'

function redirectWithSessionCookies(
  url: URL,
  supabaseResponse: NextResponse
) {
  const response = NextResponse.redirect(url)

  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie)
  }

  return response
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const protectedPrefixes = [
    '/dashboard',
    '/achievements',
    '/ai-assistant',
    '/billing',
    '/calendar',
    '/exam-planner',
    '/focus',
    '/notes',
    '/onboarding',
    '/profile',
    '/rewards',
    '/study-groups',
    '/tasks',
    '/admin',
    '/maintenance',
  ]
  const isProtected = protectedPrefixes.some(
    (prefix) =>
      request.nextUrl.pathname === prefix ||
      request.nextUrl.pathname.startsWith(`${prefix}/`)
  )
  const isHome = request.nextUrl.pathname === '/'
  const isLogin = request.nextUrl.pathname === '/login'
  const hasRememberedSession =
    request.cookies.get(REMEMBER_SESSION_COOKIE)?.value === '1'

  if (user && (isLogin || (isHome && hasRememberedSession))) {
    const url = request.nextUrl.clone()
    const requestedNext = request.nextUrl.searchParams.get('next')
    url.pathname =
      isLogin &&
      requestedNext?.startsWith('/') &&
      !requestedNext.startsWith('//')
        ? requestedNext
        : '/dashboard'
    url.search = ''
    return redirectWithSessionCookies(url, supabaseResponse)
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set(
      'next',
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    )
    return redirectWithSessionCookies(url, supabaseResponse)
  }

  if (user && isProtected) {
    const [{ data: profile }, { data: settingsRows, error: settingsError }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('role, maintenance_access, plan, trial_ends_at, pro_expires_at, subscription_status, country, timezone')
          .eq('id', user.id)
          .maybeSingle(),
        supabase.rpc('get_public_system_settings'),
      ])

    const settings = Array.isArray(settingsRows)
      ? settingsRows[0]
      : settingsRows
    const maintenanceEnabled =
      !settingsError && settings?.maintenance_mode === true
    const hasBypass =
      profile?.role === 'admin' ||
      profile?.role === 'super_admin' ||
      profile?.maintenance_access === true
    const isMaintenancePage = request.nextUrl.pathname === '/maintenance'
    const isMaintenancePreview =
      isMaintenancePage &&
      request.nextUrl.searchParams.get('preview') === '1' &&
      (profile?.role === 'admin' || profile?.role === 'super_admin')

    const needsRequiredProfile =
      profile?.role === 'student' && (!profile?.country || !profile?.timezone)
    if (needsRequiredProfile && request.nextUrl.pathname !== '/onboarding') {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      url.search = 'required=profile'
      return redirectWithSessionCookies(url, supabaseResponse)
    }

    if (maintenanceEnabled && !hasBypass && !isMaintenancePage) {
      const url = request.nextUrl.clone()
      url.pathname = '/maintenance'
      url.search = ''
      return redirectWithSessionCookies(url, supabaseResponse)
    }

    if ((!maintenanceEnabled || (hasBypass && !isMaintenancePreview)) && isMaintenancePage) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return redirectWithSessionCookies(url, supabaseResponse)
    }

    if (request.nextUrl.pathname === '/focus' && !hasActiveFocusEntitlement(profile)) {
      const url = request.nextUrl.clone()
      url.pathname = '/billing'
      url.search = 'feature=focus&reason=subscription-required'
      return redirectWithSessionCookies(url, supabaseResponse)
    }
  }

  return supabaseResponse
}
