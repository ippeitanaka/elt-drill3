"use client"

import { useEffect, useState } from 'react'
import ClientSideOCR from '@/components/admin/ClientSideOCR'
import SimpleCategoryManager from '@/components/admin/simple-category-manager'
import { QuestionSetManager } from '@/components/admin/question-set-manager'
import { QuestionEditor } from '@/components/admin/question-editor'
import type { Category } from '@/lib/types'

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/categories')
        const json = await res.json()
        if (json.success) {
          setCategories(json.categories)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 space-y-10">
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">管理コンソール</h1>
          <p className="text-gray-600">カテゴリー・問題セット・問題の管理とOCRインポート</p>
        </div>

        {/* カテゴリー管理 */}
        <section>
          <SimpleCategoryManager />
        </section>

        {/* 問題セット管理 */}
        <section>
          {!hasSupabaseEnv ? (
            <div className="p-4 border border-yellow-300 bg-yellow-50 rounded text-yellow-800">
              Supabaseの環境変数が未設定のため、問題セット管理は利用できません（カテゴリー管理とOCRは利用可能です）。
            </div>
          ) : (
            <QuestionSetManager categories={categories} onSuccess={() => { /* refresh hooks inside component */ }} />
          )}
        </section>

        {/* 問題編集 */}
        <section>
          {!hasSupabaseEnv ? (
            <div className="p-4 border border-yellow-300 bg-yellow-50 rounded text-yellow-800">
              Supabaseの環境変数が未設定のため、問題編集は利用できません。
            </div>
          ) : (
            <QuestionEditor categories={categories} onSuccess={() => { /* refresh hooks inside component */ }} />
          )}
        </section>

        {/* OCR アップロード/取り込み */}
        <section>
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">🧠 クライアントサイドOCR</h2>
            <p className="text-gray-600">ブラウザ内で高精度OCRを実行します（サーバー依存なし）</p>
          </div>
          <ClientSideOCR categories={[]} onProcessingComplete={() => { /* no-op */ }} />
        </section>
      </div>
    </main>
  )
}
