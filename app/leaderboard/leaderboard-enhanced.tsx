"use client"

import Link from 'next/link'
import { GameifiedLeaderboard } from '@/components/leaderboard/gamified-leaderboard'

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-purple-50 via-blue-50 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← ホームに戻る
          </Link>
        </div>
        
        <GameifiedLeaderboard />
      </div>
    </main>
  )
}
