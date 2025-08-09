"use client"

import React from 'react'
import { RPGFrame } from './Frame'

export function RPGHUD({ hp = 100, mp = 30, level = 1, stageName = '草原の村', exp = 0, next = 100 }: any) {
  return (
    <RPGFrame>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 text-xs">
        <div>
          <div className="text-[#ffcc00]">LV</div>
          <div className="text-white">{level}</div>
        </div>
        <div>
          <div className="text-[#ffcc00]">HP</div>
          <div className="text-white">{hp}</div>
        </div>
        <div>
          <div className="text-[#ffcc00]">MP</div>
          <div className="text-white">{mp}</div>
        </div>
        <div className="md:col-span-1 col-span-2">
          <div className="text-[#ffcc00]">NEXT</div>
          <div className="text-white">{Math.max(0, next - exp)} EXP</div>
        </div>
        <div className="col-span-2 md:col-span-4">
          <div className="text-[#00ffff] text-[10px]">STAGE</div>
          <div className="text-white text-sm">{stageName}</div>
        </div>
      </div>
    </RPGFrame>
  )
}
