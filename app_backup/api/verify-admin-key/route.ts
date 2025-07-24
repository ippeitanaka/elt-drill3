import { type NextRequest, NextResponse } from "next/server"

/**
 * POST /api/verify-admin-key
 * Body: { key: string }
 * Returns: { valid: boolean }
 */
export async function POST(req: NextRequest) {
  const { key } = (await req.json()) as { key: string }

  const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY

  if (!ADMIN_SETUP_KEY) {
    return NextResponse.json({ valid: false, error: "Admin key not set." }, { status: 500 })
  }

  const valid = key === ADMIN_SETUP_KEY
  return NextResponse.json({ valid })
}
