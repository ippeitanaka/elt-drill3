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
      if (json?.success) {
        // 正規化: 必ず choices(5件) と correct_answer_index を持たせる
        const stripInvisible = (s: any) =>
          (s ?? '')
            .toString()
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width
            .replace(/[\u00A0]/g, ' ') // NBSP
            .replace(/\u3000/g, ' ') // full-width space
            .replace(/\s+/g, ' ')
            .trim()

        const normalizeLetter = (val: any): 'a'|'b'|'c'|'d'|'e' => {
          if (val === null || val === undefined) return 'a'
          const s = String(val).trim().toLowerCase()
          if (['a','b','c','d','e'].includes(s)) return s as any
          if (/^[0-4]$/.test(s)) return (['a','b','c','d','e'][parseInt(s,10)] as any)
          if (/^[1-5]$/.test(s)) return (['a','b','c','d','e'][parseInt(s,10)-1] as any)
          return 'a'
        }

        const normalized = (json.data as any[]).map((q) => {
          const norm = (v: any) => stripInvisible(v)

          // 1) APIが choices / correct_answer_index を返す場合
          if (Array.isArray(q.choices) && q.choices.length > 0) {
            let baseChoices = q.choices.map((c: any) => {
              const t = norm(c)
              return t && t.length > 0 ? t : '—'
            })
            while (baseChoices.length < 5) baseChoices.push('—')
            const idx = Number.isInteger(q.correct_answer_index) ? Math.min(Math.max(q.correct_answer_index, 0), 4) : 0
            return { ...q, choices: baseChoices.slice(0,5), correct_answer_index: idx }
          }

          // 2) options/correct_answers(JSON) 形式
          if (q.options && q.correct_answers) {
            try {
              const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
              const correctAnswers = typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers) : q.correct_answers
              const letter = normalizeLetter(Array.isArray(correctAnswers) ? correctAnswers[0] : correctAnswers)
              const keyed = [
                { key: 'a', text: norm(options?.a) },
                { key: 'b', text: norm(options?.b) },
                { key: 'c', text: norm(options?.c) },
                { key: 'd', text: norm(options?.d) },
                { key: 'e', text: norm(options?.e) },
              ]
              const choices = keyed.map(k => (k.text && k.text.length > 0) ? k.text : '—')
              const letterToIndex: Record<string, number> = { a:0, b:1, c:2, d:3, e:4 }
              const correctIdx = letterToIndex[letter] ?? 0
              return { ...q, choices, correct_answer_index: correctIdx }
            } catch {}
          }

          // 3) 旧形式 option_a〜e + correct_answer(文字)
          const keyed = [
            { key: 'a', text: norm(q.option_a) },
            { key: 'b', text: norm(q.option_b) },
            { key: 'c', text: norm(q.option_c) },
            { key: 'd', text: norm(q.option_d) },
            { key: 'e', text: norm(q.option_e) },
          ]
          const choices = keyed.map(k => (k.text && k.text.length > 0) ? k.text : '—')
          const letterToIndex: Record<string, number> = { a:0, b:1, c:2, d:3, e:4 }
          const letter = normalizeLetter(q.correct_answer)
          const correctIdx = letterToIndex[letter] ?? 0
          return { ...q, choices, correct_answer_index: correctIdx }
        })

        setQuestions(normalized)
      }
    })()
  }, [params.id])

  const current = questions[idx]
  const progress = questions.length ? Math.round(((idx + 1) / questions.length) * 100) : 0
  const accuracy = answered ? Math.round((score / answered) * 100) : 0
  const isCleared = accuracy >= 80 && answered > 0

  // 表示用フォールバック: choices が無い場合でも5択を生成
  const displayChoices: string[] = (() => {
    if (current && Array.isArray(current.choices) && current.choices.length > 0) return current.choices
    const safe = (v: any) => (typeof v === 'string' && v.trim().length > 0) ? v.trim() : '—'
    if (!current) return []
    return [safe(current.option_a), safe(current.option_b), safe(current.option_c), safe(current.option_d), safe(current.option_e)]
  })()
  const effectiveCorrectIndex: number = (() => {
    if (current && Number.isInteger(current.correct_answer_index)) return Math.max(0, Math.min(4, current.correct_answer_index))
    if (!current) return 0
    const normalizeLetter = (val: any): 'a'|'b'|'c'|'d'|'e' => {
      if (val === null || val === undefined) return 'a'
      const s = String(val).trim().toLowerCase()
      if (['a','b','c','d','e'].includes(s)) return s as any
      if (/^[0-4]$/.test(s)) return (['a','b','c','d','e'][parseInt(s,10)] as any)
      if (/^[1-5]$/.test(s)) return (['a','b','c','d','e'][parseInt(s,10)-1] as any)
      return 'a'
    }
    const letterToIndex: Record<string, number> = { a:0, b:1, c:2, d:3, e:4 }
    return letterToIndex[normalizeLetter(current.correct_answer)] ?? 0
  })()

  const selectAnswer = (i: number) => {
    const correct = i === effectiveCorrectIndex
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
                {displayChoices.map((c: string, i: number) => (
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
