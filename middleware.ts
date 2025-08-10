import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 本番で「正しいURL」へ統一するためのリダイレクト
// NEXT_PUBLIC_CANONICAL_URL を https://example.com のように設定してください。
export function middleware(request: NextRequest) {
  // API はリダイレクトしない
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const canonical = process.env.NEXT_PUBLIC_CANONICAL_URL
  if (!canonical) return NextResponse.next()

  try {
    const canonicalUrl = new URL(canonical)
    const reqHost = request.headers.get('host') || ''

    // ホストが異なる（プレビュー/古いURL等）の場合、カノニカルに308リダイレクト
    if (reqHost && reqHost !== canonicalUrl.host) {
      const redirectUrl = new URL(request.nextUrl.toString())
      redirectUrl.protocol = canonicalUrl.protocol
      redirectUrl.host = canonicalUrl.host
      return NextResponse.redirect(redirectUrl, 308)
    }
  } catch {
    // 無効なURL設定は無視
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 静的/画像/ファビコンを除外
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
