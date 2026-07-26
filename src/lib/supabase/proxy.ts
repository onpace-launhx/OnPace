import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (user && isProtected) {
    const [{ data: profile }, { data: settingsRows, error: settingsError }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('role, maintenance_access')
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

    if (maintenanceEnabled && !hasBypass && !isMaintenancePage) {
      const url = request.nextUrl.clone()
      url.pathname = '/maintenance'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if ((!maintenanceEnabled || (hasBypass && !isMaintenancePreview)) && isMaintenancePage) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
