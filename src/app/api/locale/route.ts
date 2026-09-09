import { NextResponse } from 'next/server'
import { isLocale, LOCALE_COOKIE } from '@/i18n/config'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!isLocale(body?.locale)) {
    return NextResponse.json({ error: 'Invalid locale' }, { status: 400 })
  }

  const response = NextResponse.json({ locale: body.locale })
  response.cookies.set(LOCALE_COOKIE, body.locale, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
  return response
}
