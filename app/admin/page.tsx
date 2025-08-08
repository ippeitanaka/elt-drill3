"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Upload, Settings, Database, Sparkles } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import ClientSideOCR from '@/components/admin/ClientSideOCR'
import { ServerOCRUpload } from '@/components/admin/ServerOCRUpload'
interface Category {
  id: number
  name: string
  created_at: string
}

interface AdminStats {
  totalQuestions: number
  totalCategories: number
  totalUsers: number
  totalBadges: number
}

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<AdminStats>({
    totalQuestions: 0,
    totalCategories: 0,
    totalUsers: 0,
    totalBadges: 0
  })
  const [loading, setLoading] = useState(true)
  const [showOCRProcessor, setShowOCRProcessor] = useState(false)
  const [showServerOCR, setShowServerOCR] = useState(false)
  const [processingResult, setProcessingResult] = useState<any>(null)

  // カテゴリーデータの読み込み
  const loadAdminData = async () => {
    try {
      setLoading(true)
      
      // カテゴリーをAPIエンドポイント経由で取得
      const categoriesResponse = await fetch('/api/debug/categories')
      let categoriesCount = 0
      if (categoriesResponse.ok) {
        const categoriesResult = await categoriesResponse.json()
        console.log('カテゴリーAPI経由取得成功:', categoriesResult)
        if (categoriesResult.success && categoriesResult.categories) {
          setCategories(categoriesResult.categories as Category[])
          categoriesCount = categoriesResult.categories.length
        }
      } else {
        console.error('カテゴリーAPI取得エラー:', categoriesResponse.status)
      }

      // 統計データも代替APIで取得
      const supabase = getSupabaseClient()
      const [questionsResult] = await Promise.allSettled([
        supabase.from('questions').select('id', { count: 'exact' })
      ])

      setStats({
        totalQuestions: questionsResult.status === 'fulfilled' ? questionsResult.value.count || 0 : 0,
        totalCategories: categoriesCount,
        totalUsers: 0, // usersテーブルは存在しないため0
        totalBadges: 0 // badgesテーブルは存在しないため0
      })

    } catch (error) {
      console.error('データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const handleProcessingComplete = (result: any) => {
    setProcessingResult(result)
    setShowOCRProcessor(false)
    loadAdminData() // データを再読み込み
  }

  const handleNewProcessing = () => {
    setProcessingResult(null)
    setShowOCRProcessor(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">管理データを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎓 ELT クイズアプリ 管理画面
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            ハイブリッドOCR機能でPDFから医療系問題を自動抽出し、クイズデータベースを構築します
          </p>
        </div>

        {/* 統計カード */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <CardContent className="p-6 text-center">
              <Database className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
              <p className="text-sm text-gray-600">問題数</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <CardContent className="p-6 text-center">
              <Settings className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
              <p className="text-sm text-gray-600">カテゴリー数</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardContent className="p-6 text-center">
              <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              <p className="text-sm text-gray-600">ユーザー数</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
            <CardContent className="p-6 text-center">
              <Sparkles className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.totalBadges}</p>
              <p className="text-sm text-gray-600">バッジ数</p>
            </CardContent>
          </Card>
        </div>

        {/* メイン機能ボタン */}
        {!showOCRProcessor && !showServerOCR && !processingResult && (
          <div className="text-center mb-8">
            <Card className="max-w-3xl mx-auto bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 justify-center text-2xl">
                  🚀 OCR処理方式選択
                </CardTitle>
                <CardDescription className="text-base">
                  PDFから問題を抽出する方式を選択してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* クライアントサイドOCR */}
                  <Card className="border-2 hover:border-blue-300 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-lg text-blue-700">
                        🖥️ クライアントサイドOCR
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ul className="text-sm space-y-1">
                        <li>• ブラウザ内で処理</li>
                        <li>• リアルタイムプレビュー</li>
                        <li>• 高速な初期処理</li>
                        <li>• ローカルワーカーファイル使用</li>
                      </ul>
                      <Button 
                        onClick={() => setShowOCRProcessor(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        クライアントOCR開始
                      </Button>
                    </CardContent>
                  </Card>

                  {/* サーバーサイドOCR */}
                  <Card className="border-2 hover:border-green-300 transition-colors">
                    <CardHeader>
                      <CardTitle className="text-lg text-green-700">
                        🚀 サーバーサイドOCR
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <ul className="text-sm space-y-1">
                        <li>• サーバーで高精度処理</li>
                        <li>• クライアント負荷軽減</li>
                        <li>• 安定したOCR精度</li>
                        <li>• 直接データベース保存</li>
                      </ul>
                      <Button 
                        onClick={() => setShowServerOCR(true)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Database className="mr-2 h-4 w-4" />
                        サーバーOCR開始
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-900 mb-2">� どちらを選ぶべき？</h4>
                  <div className="text-sm text-amber-800 space-y-1">
                    <div><strong>クライアントOCR:</strong> 素早く結果を確認したい場合</div>
                    <div><strong>サーバーOCR:</strong> より安定した処理を求める場合</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* クライアントサイドOCR処理コンポーネント */}
        {showOCRProcessor && (
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <Button 
                variant="outline" 
                onClick={() => setShowOCRProcessor(false)}
              >
                ← 戻る
              </Button>
            </div>
            <ClientSideOCR 
              categories={categories}
              onProcessingComplete={handleProcessingComplete}
            />
          </div>
        )}

        {/* サーバーサイドOCR処理コンポーネント */}
        {showServerOCR && (
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <Button 
                variant="outline" 
                onClick={() => setShowServerOCR(false)}
              >
                ← 戻る
              </Button>
            </div>
            <ServerOCRUpload />
          </div>
        )}

        {/* 処理結果表示 */}
        {processingResult && (
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <Button onClick={handleNewProcessing}>
                新しいファイルを処理
              </Button>
            </div>
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ✅ OCR処理完了
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">{processingResult.message}</p>
                    {processingResult.questionsFound > 0 && (
                      <div className="mt-2 text-sm text-green-700">
                        <p>📝 抽出された問題数: {processingResult.questionsFound}問</p>
                        <p>🆔 問題セットID: {processingResult.questionSetId}</p>
                      </div>
                    )}
                  </div>
                  
                  {processingResult.extractedQuestions && (
                    <div className="space-y-2">
                      <h4 className="font-medium">抽出された問題（プレビュー）:</h4>
                      {processingResult.extractedQuestions.map((q: any, index: number) => (
                        <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                          <p><strong>問題 {index + 1}:</strong> {q.question}</p>
                          <p className="text-blue-600">選択肢数: {q.optionCount}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* カテゴリー一覧 */}
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>📂 カテゴリー一覧</CardTitle>
            <CardDescription>
              利用可能なクイズカテゴリー ({categories.length}個)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="p-4 border rounded-lg bg-white/70 hover:bg-white/90 transition-colors">
                  <h3 className="font-medium text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">ID: {category.id}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    作成日: {new Date(category.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              ))}
            </div>
            
            {categories.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                カテゴリーが見つかりません
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
