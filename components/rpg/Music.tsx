"use client"

import React, { useEffect, useRef, useState } from 'react'

// Simple chiptune-like BGM using WebAudio (no external assets, user-gesture required)
export function BGM({ autoplay = false }: { autoplay?: boolean }) {
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (autoplay) {
      // Autoplay is often blocked; require user gesture. We'll no-op here.
    }
    return () => {
      stop()
    }
  }, [])

  const start = () => {
    if (on) return
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    ctxRef.current = ctx
    const gain = ctx.createGain()
    gain.gain.value = 0.05
    gain.connect(ctx.destination)

    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.connect(gain)

    // Simple 8-bit arpeggio loop (I–V–vi–IV)
    const base = 220 // A3
    const pattern = [0, 7, 12, 7, 0, 7, 12, 16] // semitones
    const t0 = ctx.currentTime
    const step = 0.2
    for (let bar = 0; bar < 64; bar++) {
      pattern.forEach((semi, i) => {
        const t = t0 + (bar * pattern.length + i) * step
        const freq = base * Math.pow(2, semi / 12)
        osc.frequency.setValueAtTime(freq, t)
      })
    }
    osc.start()
    nodesRef.current = { osc, gain }
    setOn(true)
  }

  const stop = () => {
    if (!on) return
    try {
      nodesRef.current?.osc.stop()
      nodesRef.current?.osc.disconnect()
      nodesRef.current?.gain.disconnect()
    } catch {}
    try { ctxRef.current?.close() } catch {}
    nodesRef.current = null
    ctxRef.current = null
    setOn(false)
  }

  return (
    <button
      onClick={() => (on ? stop() : start())}
      className={`px-3 py-1 text-xs rounded border-2 ${on ? 'bg-[#00ffff] text-[#001a33] border-[#00ffff]' : 'bg-transparent text-[#00ffff] border-[#00ffff]/50'} hover:opacity-90`}
    >
      {on ? '♪ BGM ON' : '♪ BGM OFF'}
    </button>
  )
}
