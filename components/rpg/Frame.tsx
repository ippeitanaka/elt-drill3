"use client"

import React from 'react'
import { Press_Start_2P } from 'next/font/google'

const press = Press_Start_2P({ weight: '400', subsets: ['latin'] })

type Variant = 'primary' | 'danger' | 'ghost'

// Retro RPG frame with double neon-like border (using Tailwind arbitrary values)
export function RPGFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-md p-1 bg-[#0b2c59] text-[#e6f7ff] shadow-[0_0_0_2px_#00ffff,inset_0_0_0_2px_#003a66,0_0_14px_rgba(0,255,255,0.33)] ${press.className}`}
    >
      <div className={`rounded-sm bg-[#00142a] ${className}`}>
        {children}
      </div>
    </div>
  )
}

export function RPGButton({ children, onClick, disabled, variant = 'primary', className = '' }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: Variant; className?: string }) {
  const map: Record<Variant, string> = {
    primary: 'bg-[#ffcc00] text-[#1a1a1a] border-[#00ffff] hover:bg-yellow-400',
    danger: 'bg-red-500 text-white border-[#00ffff] hover:bg-red-600',
    ghost: 'bg-transparent text-[#00ffff] border-[#00ffff]/40 hover:bg-[#0b2c59]'
  }
  const base = map[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-sm border-2 ${base} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className} ${press.className}`}
    >
      {children}
    </button>
  )
}

export function RPGPanel({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <RPGFrame>
      {title && (
        <div className="px-3 py-2 text-[#ffcc00]">
          ▶ {title}
        </div>
      )}
      <div className={`px-3 pb-3 ${className}`}>{children}</div>
    </RPGFrame>
  )
}
