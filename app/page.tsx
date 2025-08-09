"use client"

import Link from 'next/link'
import { RPGPanel, RPGButton } from '@/components/rpg/Frame'
import { BGM } from '@/components/rpg/Music'

export default function Opening() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-3xl px-4">
        <RPGPanel title="EMERGENCY QUEST">
          <div className="p-6 space-y-6 text-center">
            <h1 className="text-2xl text-white">EMERGENCY QUEST</h1>
            <p className="text-cyan-200 text-sm">救急救命の知識でダンジョンを攻略せよ！</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/rpg">
                <RPGButton>はじめる</RPGButton>
              </Link>
              <Link href="/admin">
                <RPGButton variant="ghost">管理</RPGButton>
              </Link>
              <BGM />
            </div>
          </div>
        </RPGPanel>
      </div>
    </main>
  )
}
