"use client"

import React from 'react'
import { RPGFrame, RPGButton } from './Frame'

type Enemy = {
  name: string
  difficulty: number // 1-5
  hp: number
}

export function EncounterCard({ enemy, onStart }: { enemy: Enemy; onStart: () => void }) {
  const stars = '★★★★★'.slice(0, enemy.difficulty)
  return (
    <RPGFrame>
      <div className="p-4 flex items-center justify-between">
        <div>
          <div className="text-[#ffcc00] text-sm">ENEMY</div>
          <div className="text-white text-lg">{enemy.name}</div>
          <div className="text-cyan-300 text-xs">難易度: {stars}</div>
        </div>
        <RPGButton onClick={onStart}>戦う！</RPGButton>
      </div>
    </RPGFrame>
  )
}
