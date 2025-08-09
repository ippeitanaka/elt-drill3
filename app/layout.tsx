import type { Metadata } from 'next'
import { Press_Start_2P } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const press = Press_Start_2P({ weight: '400', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Emergency Quest',
  description: 'Dragon Quest-like quiz adventure',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${press.className} bg-[linear-gradient(180deg,#001a33_0%,#000814_100%)] text-[#e6f7ff]`}>
        <header className="sticky top-0 z-50 border-b border-[#00ffff]/30 bg-[#0b2c59]/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 h-12 flex items-center justify-between">
            <Link href="/rpg" className="text-[#00ffff] hover:underline" aria-label="ホームへ">
              ▶ Emergency Quest
            </Link>
            <nav className="flex items-center gap-3 text-xs">
              <Link href="/rpg" className="text-[#ffcc00] hover:underline">ステージ</Link>
              <Link href="/admin" className="text-[#00ffff] hover:underline">管理</Link>
            </nav>
          </div>
        </header>
        <main className="pt-12 min-h-screen">{children}</main>
      </body>
    </html>
  )
}
