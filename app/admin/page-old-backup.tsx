"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Upload, Settings, Database, Sparkles } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import ClientSideOCR from '@/components/admin/ClientSideOCR'
import type { Category } from '@/lib/types'

// 完全OCR機能コンポーネント
function CompletePDFAnalyzer({ categories, onClose }: { categories: Category[], onClose: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setResult(null)
    } else {
      alert('PDFファイルを選択してください')
    }
  }

  const processPDF = async () => {
    if (!selectedFile) {
      alert('PDFファイルを選択してください')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResult(null)

    try {
      // プログレス更新のシミュレーション
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const formData = new FormData()
      formData.append('pdf', selectedFile)
      
      // カテゴリーが選択されている場合は追加
      if (selectedCategory) {
        formData.append('category', selectedCategory)
      } else {
        formData.append('category', '心肺停止') // デフォルトカテゴリー
      }

      console.log('📤 シンプルPDF分析開始:', selectedFile.name)

      const response = await fetch('/api/debug-pdf-analysis-simple', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      clearInterval(progressInterval)
      setProgress(100)
      
      console.log('📥 シンプルPDF分析結果:', data)
      setResult({ success: response.ok, data, status: response.status, statusText: response.statusText })

    } catch (error) {
      console.error('❌ 完全OCR分析エラー:', error)
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-lg font-medium text-blue-900 mb-2">🔬 シンプルPDF分析機能</h3>
        <p className="text-sm text-blue-700">
          PDFファイルの基本情報を取得してAPIの動作確認を行います。OCR機能は無効化されています。
        </p>
        <p className="text-xs text-blue-600 mt-2">
          <strong>使用API:</strong> /api/debug-pdf-analysis-simple
        </p>
      </div>

      {/* ファイル選択 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">📄 PDFファイル選択</label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={isProcessing}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        {selectedFile && (
          <p className="text-sm text-green-600">
            ✓ 選択済み: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      {/* カテゴリー選択 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">📂 カテゴリー選択</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          disabled={isProcessing}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">自動検出 (デフォルト: 心肺停止)</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* 処理実行ボタン */}
      <Button
        onClick={processPDF}
        disabled={!selectedFile || isProcessing}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {isProcessing ? '完全OCR分析実行中...' : '🔬 完全OCR分析を実行'}
      </Button>

      {/* プログレスバー */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-gray-600">
            🔄 完全OCR分析中... {progress}%
          </p>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="space-y-4">
          {result.success ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    ✅ 完全OCR分析成功！
                  </h3>
                  <p className="text-xs text-green-600 mt-1">
                    ステータス: {result.status} {result.statusText}
                  </p>
                  <div className="mt-2 text-sm text-green-700">
                    <details>
                      <summary className="cursor-pointer text-green-800 font-medium">📋 詳細結果を表示</summary>
                      <pre className="whitespace-pre-wrap text-xs bg-green-100 p-2 rounded max-h-96 overflow-y-auto mt-2">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="h-5 w-5 text-red-400">❌</div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    エラーが発生しました
                  </h3>
                  {result.status && (
                    <p className="text-xs text-red-600 mt-1">
                      ステータス: {result.status} {result.statusText}
                    </p>
                  )}
                  <div className="mt-2 text-sm text-red-700">
                    <details>
                      <summary className="cursor-pointer text-red-800 font-medium">📋 エラー詳細を表示</summary>
                      <pre className="whitespace-pre-wrap text-xs bg-red-100 p-2 rounded max-h-96 overflow-y-auto mt-2">
                        {result.error || JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminPageSimple() {
  const supabase = getSupabaseClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [showPDFAnalyzer, setShowPDFAnalyzer] = useState(false)
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalUsers: 0,
    totalQuizzes: 0,
    categoriesCount: 0
  })

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      console.log('🔄 管理画面でカテゴリー取得開始')
      
      // APIからカテゴリーを取得
      const response = await fetch('/api/debug-categories')
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      const categoryResult = await response.json()
      console.log('📊 カテゴリーAPI結果:', categoryResult)
      
      if (!categoryResult.success) {
        throw new Error(categoryResult.error || 'カテゴリー取得に失敗しました')
      }
      
      const categoriesData = categoryResult.data || []
      console.log('📊 生データ確認:', categoriesData)

      const formattedCategories: Category[] = categoriesData.map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        icon: String(item.icon || '📚'),
        color: String(item.color || 'red'),
        description: String(item.description || `${item.name}に関する問題`),
        total_questions: Number(item.total_questions || 0),
        created_at: String(item.created_at),
        updated_at: String(item.updated_at || item.created_at),
      }))

      console.log('📋 フォーマット後:', formattedCategories)

      setCategories(formattedCategories)
      console.log('✅ 管理画面: カテゴリー取得完了', {
        count: formattedCategories.length,
        categories: formattedCategories
      })

      // 統計情報を取得
      try {
        const statsResponse = await fetch('/api/debug-table-structure')
        const statsResult = await statsResponse.json()
        
        if (statsResult.success) {
          setStats({
            totalQuestions: statsResult.data.questionsCount || 0,
            totalUsers: 0,
            totalQuizzes: statsResult.data.questionSets?.length || 0,
            categoriesCount: formattedCategories.length
          })
        }
      } catch (statsError) {
        console.error('統計情報取得エラー:', statsError)
      }

    } catch (error) {
      console.error('❌ 管理画面データ取得エラー:', error)
    }
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 ELT Drill 管理画面 (簡潔版)</h1>
        <p className="text-gray-600">完全OCR機能による医療問題抽出システム</p>
      </div>

      {/* メイン機能 */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <Upload className="h-5 w-5 text-purple-600" />
              完全OCR機能
            </CardTitle>
            <CardDescription>
              強化されたOCR機能による医療問題抽出
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              「３巻　心肺停止.pdf」などのPDFファイルから医療問題を自動抽出し、データベースに保存します。
            </p>
            <Button 
              onClick={() => setShowPDFAnalyzer(true)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              完全OCR機能を開く
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              システム情報
            </CardTitle>
            <CardDescription>
              現在のデータベース状況
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.totalQuestions}</p>
                <p className="text-sm text-gray-600">登録問題数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.categoriesCount}</p>
                <p className="text-sm text-gray-600">カテゴリー数</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* カテゴリー一覧 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>📂 カテゴリー一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="p-3 border rounded-lg">
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-500">問題数: {category.total_questions}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* モーダル */}
      {showPDFAnalyzer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">🔬 完全OCR機能</h2>
              <Button
                variant="outline"
                onClick={() => setShowPDFAnalyzer(false)}
              >
                閉じる
              </Button>
            </div>
            <div className="p-6">
              <CompletePDFAnalyzer 
                categories={categories} 
                onClose={() => {
                  setShowPDFAnalyzer(false)
                  loadAdminData() // データを再読み込み
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
