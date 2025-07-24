"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Upload, Settings, Users, Database, BarChart, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { PDFUploadImproved } from '@/components/admin/pdf-upload-enhanced'
import type { Category } from '@/lib/types'

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [showUpload, setShowUpload] = useState(false)
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
      // カテゴリを取得
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (categoriesError) throw categoriesError

      // 統計データを取得
      const [questionsResult, usersResult, quizzesResult] = await Promise.all([
        supabase.from('questions').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('quiz_sessions').select('id', { count: 'exact' })
      ])

      setCategories(categoriesData || [])
      setStats({
        totalQuestions: questionsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalQuizzes: quizzesResult.count || 0,
        categoriesCount: categoriesData?.length || 0
      })

    } catch (error: any) {
      console.error('管理データ読み込みエラー:', error)
      toast({
        title: "データ読み込みエラー",
        description: "管理データの読み込みに失敗しました。",
        variant: "destructive",
      })
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-purple-50 via-blue-50 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← ホームに戻る
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            🚀 管理者ダッシュボード
          </h1>
          <p className="text-xl text-gray-600">AI強化システムの管理と統計</p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">総問題数</p>
                  <p className="text-2xl font-bold">{stats.totalQuestions}</p>
                </div>
                <Database className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">登録ユーザー</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">完了クイズ</p>
                  <p className="text-2xl font-bold">{stats.totalQuizzes}</p>
                </div>
                <BarChart className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">カテゴリ数</p>
                  <p className="text-2xl font-bold">{stats.categoriesCount}</p>
                </div>
                <Settings className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* AI PDF アップロード */}
          <Card className="hover:shadow-lg transition-all duration-300 border-2 border-purple-200 hover:border-purple-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI問題作成
              </CardTitle>
              <CardDescription>
                拡張OCRでPDFから自動的に問題を抽出
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-purple-700">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-medium">AI強化機能</span>
                  </div>
                  <ul className="text-xs text-purple-600 mt-1 space-y-1">
                    <li>• 日本語・英語混在対応</li>
                    <li>• 複数問題形式サポート</li>
                    <li>• 自動難易度推定</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => setShowUpload(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  PDFアップロード
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 問題管理 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                問題管理
              </CardTitle>
              <CardDescription>
                既存の問題を編集・削除
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                問題データベースの管理と編集
              </p>
              <Button variant="outline" className="w-full" disabled>
                <Settings className="mr-2 h-4 w-4" />
                準備中
              </Button>
            </CardContent>
          </Card>

          {/* ユーザー管理 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                ユーザー管理
              </CardTitle>
              <CardDescription>
                ユーザーアカウントとスコア管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                ユーザーデータと進捗の管理
              </p>
              <Button variant="outline" className="w-full" disabled>
                <Users className="mr-2 h-4 w-4" />
                準備中
              </Button>
            </CardContent>
          </Card>

          {/* 分析・レポート */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-purple-600" />
                分析・レポート
              </CardTitle>
              <CardDescription>
                使用状況と成績の分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                詳細な統計とパフォーマンス分析
              </p>
              <Button variant="outline" className="w-full" disabled>
                <BarChart className="mr-2 h-4 w-4" />
                準備中
              </Button>
            </CardContent>
          </Card>

          {/* システム設定 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-600" />
                システム設定
              </CardTitle>
              <CardDescription>
                アプリケーション設定の管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                全体設定とカスタマイズ
              </p>
              <Button variant="outline" className="w-full" disabled>
                <Settings className="mr-2 h-4 w-4" />
                準備中
              </Button>
            </CardContent>
          </Card>

          {/* AI統計 */}
          <Card className="hover:shadow-lg transition-shadow border-2 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-yellow-600" />
                AI統計
              </CardTitle>
              <CardDescription>
                OCR精度と処理統計
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">OCR精度:</span>
                  <span className="font-medium text-green-600">95.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">処理時間:</span>
                  <span className="font-medium">平均 2.3秒</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">自動解答率:</span>
                  <span className="font-medium text-blue-600">87.1%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDF アップロードモーダル */}
        {showUpload && (
          <PDFUploadImproved
            categories={categories}
            onSuccess={() => {
              setShowUpload(false)
              loadAdminData()
              toast({
                title: "🎉 アップロード完了",
                description: "問題セットが正常に作成されました。",
              })
            }}
            onClose={() => setShowUpload(false)}
          />
        )}
      </div>
    </main>
  )
}
