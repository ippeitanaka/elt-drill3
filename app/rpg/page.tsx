"use client"

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RPGHUD } from '@/components/rpg/HUD'
import { RPGFrame, RPGPanel, RPGButton } from '@/components/rpg/Frame'
import { EncounterCard } from '@/components/rpg/Encounter'

// Stage = category
export default function RPGHome() {
  const [categories, setCategories] = useState<any[] | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/quiz-categories', { cache: 'no-store' })
        const json = await res.json()
        if (json?.success) {
          const cats = (json.data?.categories || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            total: c.total_questions ?? c.count ?? 0,
            avg_difficulty: c.avg_difficulty ?? 3,
          }))
          setCategories(cats)
        } else {
          // client-side mock fallback
          setCategories([
            { id: 'demo-1', name: '基礎医学', total: 25, avg_difficulty: 2 },
            { id: 'demo-2', name: '解剖生理', total: 40, avg_difficulty: 3 },
            { id: 'demo-3', name: '救急処置', total: 32, avg_difficulty: 4 },
            { id: 'demo-4', name: '法律・倫理', total: 18, avg_difficulty: 1 },
          ])
        }
      } catch {
        // client-side mock fallback
        setCategories([
          { id: 'demo-1', name: '基礎医学', total: 25, avg_difficulty: 2 },
          { id: 'demo-2', name: '解剖生理', total: 40, avg_difficulty: 3 },
          { id: 'demo-3', name: '救急処置', total: 32, avg_difficulty: 4 },
          { id: 'demo-4', name: '法律・倫理', total: 18, avg_difficulty: 1 },
        ])
      }
    })()
  }, [])

  const enemies = useMemo(() => {
    return (categories || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      difficulty: Math.max(1, Math.min(5, Math.round(c.avg_difficulty || 3))),
      hp: 100 + (c.total || 10) * 2,
    }))
  }, [categories])

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#001a33_0%,#000814_100%)]">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-cyan-300 underline">オープニング</Link>
          <div className="text-[#ffcc00] text-sm">EMERGENCY QUEST</div>
        </div>

        <RPGHUD level={1} stageName={selectedCategory?.name ? `「${selectedCategory.name}」` : 'ステージ選択'} />

        <RPGPanel title="ステージを選んでください">
          {!categories ? (
            <div className="p-6">読み込み中...</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {enemies.map((e) => (
                <EncounterCard key={e.id} enemy={e} onStart={() => setSelectedCategory(e)} />
              ))}
            </div>
          )}
        </RPGPanel>

        {selectedCategory && (
          <RPGPanel title={`ステージ「${selectedCategory.name}」 勝利条件: 正答率80%`}>
            <div className="p-3 space-y-3">
              <div className="text-cyan-200 text-sm">敵の強さ: {'★★★★★'.slice(0, selectedCategory.difficulty)}</div>
              <div className="flex gap-3">
                <Link href={`/rpg/stage/${selectedCategory.id}`}>
                  <RPGButton>冒険をはじめる</RPGButton>
                </Link>
                <RPGButton variant="ghost" onClick={() => setSelectedCategory(null)}>戻る</RPGButton>
              </div>
            </div>
          </RPGPanel>
        )}
      </div>
    </div>
  )
}
