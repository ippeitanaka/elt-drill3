"use client"

import React, { useEffect, useRef, useState } from 'react'

// オリジナルの8bit風BGM。特定作品のメロディは使用しません。
// track: opening / select / battle1 / battle2 / victory など
export function BGM({ autoplay = false, track = 'opening' }: { autoplay?: boolean; track?: 'opening'|'select'|'battle1'|'battle2'|'victory' }) {
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const oscRefs = useRef<OscillatorNode[]>([])
  const [on, setOn] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<typeof track>(track)

  useEffect(() => {
    setCurrentTrack(track)
  }, [track])

  useEffect(() => {
    if (autoplay) {
      // ブラウザのポリシーにより自動再生は多くの場合ブロックされます
    }
    return () => stop()
  }, [])

  const start = () => {
    if (on) return
    const AudioCtx: any = (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioCtx()
    ctxRef.current = ctx

    const master = ctx.createGain()
    master.gain.value = 0.06
    master.connect(ctx.destination)
    gainRef.current = master

    // シンプルな2オシレータ(メロ+ベース)
    const lead = ctx.createOscillator()
    const bass = ctx.createOscillator()
    lead.type = 'square'
    bass.type = 'triangle'
    const leadGain = ctx.createGain(); leadGain.gain.value = 0.7
    const bassGain = ctx.createGain(); bassGain.gain.value = 0.5
    lead.connect(leadGain).connect(master)
    bass.connect(bassGain).connect(master)

    // トラックごとのパターンをスケジュール
    scheduleTrack(ctx, lead, bass, currentTrack)

    lead.start()
    bass.start()
    oscRefs.current = [lead, bass]
    setOn(true)
  }

  const stop = () => {
    if (!on) return
    try {
      oscRefs.current.forEach(o => { try { o.stop() } catch {} try { o.disconnect() } catch {} })
      gainRef.current?.disconnect()
      ctxRef.current?.close()
    } catch {}
    oscRefs.current = []
    gainRef.current = null
    ctxRef.current = null
    setOn(false)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="bgm-track">BGM Track</label>
      <select
        id="bgm-track"
        aria-label="BGM Track"
        value={currentTrack}
        onChange={(e) => setCurrentTrack(e.target.value as any)}
        className="px-2 py-1 text-xs bg-transparent border-2 border-[#00ffff]/50 text-[#00ffff] rounded"
      >
        <option value="opening">OP</option>
        <option value="select">Select</option>
        <option value="battle1">Battle 1</option>
        <option value="battle2">Battle 2</option>
        <option value="victory">Victory</option>
      </select>
      <button
        onClick={() => (on ? stop() : start())}
        className={`px-3 py-1 text-xs rounded border-2 ${on ? 'bg-[#00ffff] text-[#001a33] border-[#00ffff]' : 'bg-transparent text-[#00ffff] border-[#00ffff]/50'} hover:opacity-90`}
      >
        {on ? '♪ ON' : '♪ OFF'}
      </button>
    </div>
  )
}

// 周波数ユーティリティ
function freq(base: number, semi: number) { return base * Math.pow(2, semi / 12) }

// トラック定義（安全なオリジナル進行）
function scheduleTrack(ctx: AudioContext, lead: OscillatorNode, bass: OscillatorNode, track: string) {
  const t0 = ctx.currentTime
  const step = 0.2 // 1拍

  // opening: 長調の勇ましい分散和音
  const openingLead = [0, 4, 7, 12, 7, 4, 0, 4]
  const openingBass = [0, 0, -5, -5, -3, -3, -7, -7]

  // select: 落ち着いたドリアン風
  const selectLead = [0, 2, 5, 7, 5, 2, 3, 5]
  const selectBass = [0, -5, -3, -7, -2, -5, -7, -10]

  // battle1: 短調の疾走感
  const battle1Lead = [0, 3, 7, 10, 7, 3, 2, 5]
  const battle1Bass = [0, -5, -8, -3, -2, -7, -10, -5]

  // battle2: モーダル混交で緊張感
  const battle2Lead = [0, 1, 5, 8, 10, 8, 5, 1]
  const battle2Bass = [0, -6, -1, -8, -3, -10, -5, -12]

  // victory: 短い上昇フレーズ
  const victoryLead = [0, 4, 7, 12, 14, 12, 7, 4]
  const victoryBass = [0, -5, 0, -5, 0, -5, 0, -5]

  const baseLead = 330 // E4
  const baseBass = 110 // A2付近

  let L: number[] = openingLead, B: number[] = openingBass
  switch (track) {
    case 'select': L = selectLead; B = selectBass; break
    case 'battle1': L = battle1Lead; B = battle1Bass; break
    case 'battle2': L = battle2Lead; B = battle2Bass; break
    case 'victory': L = victoryLead; B = victoryBass; break
  }

  // ループスケジュール（数十小節）
  const bars = 64
  for (let bar = 0; bar < bars; bar++) {
    L.forEach((semi, i) => {
      const t = t0 + (bar * L.length + i) * step
      ;(lead.frequency as any).setValueAtTime(freq(baseLead, semi), t)
    })
    B.forEach((semi, i) => {
      const t = t0 + (bar * B.length + i) * step
      ;(bass.frequency as any).setValueAtTime(freq(baseBass, semi), t)
    })
  }
}
