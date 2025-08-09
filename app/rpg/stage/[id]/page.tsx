"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { RPGHUD } from '@/components/rpg/HUD'
import { RPGButton, RPGPanel } from '@/components/rpg/Frame'

// Minimal battle-like quiz runner: clear when accuracy >= 80%
export default function StageBattlePage() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const [questions, setQuestions] = useState<any[]>([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [enemyHp, setEnemyHp] = useState(100)

  useEffect(() => {
    ;(async () => {
      const res = await fetch('/api/quiz-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedCategories: [params.id], selectedSets: [], questionCount: 1000 })
      })
      const json = await res.json()
      if (json?.success) setQuestions(json.data)
    })()
  }, [params.id])

  const current = questions[idx]
  const progress = questions.length ? Math.round(((idx + 1) / questions.length) * 100) : 0
  const accuracy = answered ? Math.round((score / answered) * 100) : 0
  const isCleared = accuracy >= 80 && answered > 0

  const selectAnswer = (i: number) => {
    const correct = i === current?.correct_answer_index
    setAnswered(a => a + 1)
    if (correct) {
      setScore(s => s + 1)
      setEnemyHp(h => Math.max(0, h - 10))
    }
    setTimeout(() => {
      if (idx < questions.length - 1) setIdx(idx + 1)
    }, 300)
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#001a33_0%,#000814_100%)] text-[#e6f7ff]">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/rpg" className="text-cyan-300 underline">ステージ選択</Link>
          <div className="text-[#ffcc00] text-sm">正答率80%で勝利</div>
        </div>

        <RPGHUD level={1} stageName={`ステージ #${params.id}`} />

        <RPGPanel title="バトル">
          {!current ? (
            <div className="p-6">読み込み中...</div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>敵HP: <span className="text-[#ffcc00]">{enemyHp}</span></div>
                <div>進捗: {progress}% / 正答率: <span className="text-[#00ffff]">{accuracy}%</span></div>
              </div>
              <div className="text-lg leading-relaxed">{current.question_text}</div>
              <div className="grid gap-2">
                {(current.choices || []).map((c: string, i: number) => (
                  <RPGButton key={i} onClick={() => selectAnswer(i)} className="justify-start">{String.fromCharCode(65+i)}. {c}</RPGButton>
                ))}
              </div>
            </div>
          )}
        </RPGPanel>

        <div className="flex gap-3">
          {isCleared ? (
            <RPGButton onClick={() => router.push('/rpg')}>
              ステージクリア！ 戻る
            </RPGButton>
          ) : (
            <RPGButton variant="ghost" onClick={() => router.push('/rpg')}>あきらめる</RPGButton>
          )}
        </div>
      </div>
    </div>
  )
}
