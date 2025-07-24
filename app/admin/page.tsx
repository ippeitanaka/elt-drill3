"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Upload, Settings, Users, Database, BarChart, Sparkles, Plus, Edit, Wifi } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { PDFUploadImproved } from '@/components/admin/pdf-upload-enhanced'
import { CategoryManager } from '@/components/admin/category-manager'
import { SupabaseConnectionTest } from '@/components/admin/supabase-connection-test'
import { DatabaseSchemaCheck } from '@/components/admin/database-schema-check'
import type { Category } from '@/lib/types'

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [showConnectionTest, setShowConnectionTest] = useState(false)
  const [showSchemaCheck, setShowSchemaCheck] = useState(false)
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
    <main className="min-h-screen p-8 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← ホームに戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🔧 管理画面</h1>
          <p className="text-xl text-gray-600">問題の管理と設定</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📄 PDF問題アップロード
              </CardTitle>
              <CardDescription>
                問題PDFと解答PDFをアップロード
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                PDFファイルをアップロードして自動的に問題を抽出します
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    問題PDF
                  </label>
                  <input 
                    type="file" 
                    accept=".pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    解答PDF
                  </label>
                  <input 
                    type="file" 
                    accept=".pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                  アップロード・解析
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📝 手動問題作成
              </CardTitle>
              <CardDescription>
                問題を手動で作成・編集
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                問題文と選択肢を手動で入力して作成
              </p>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                問題作成エディタを開く
              </button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                カテゴリー管理
              </CardTitle>
              <CardDescription>
                学習カテゴリーの追加・編集・削除
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                問題のカテゴリーを管理し、整理する
              </p>
              <Button 
                onClick={() => setShowCategoryManager(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                カテゴリー管理を開く
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                データベース接続
              </CardTitle>
              <CardDescription>
                Supabase接続状況の確認
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                データベースとの接続状況をテスト
              </p>
              <Button 
                onClick={() => setShowConnectionTest(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Database className="h-4 w-4 mr-2" />
                接続テストを開く
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                データベース構造
              </CardTitle>
              <CardDescription>
                テーブル構造とデータの確認
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                既存のテーブル構造とサンプルデータを確認
              </p>
              <Button 
                onClick={() => setShowSchemaCheck(true)}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                <Database className="h-4 w-4 mr-2" />
                スキーマをチェック
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                👥 ユーザー管理
              </CardTitle>
              <CardDescription>
                ユーザーアカウントの管理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                ユーザーの登録状況や成績を確認
              </p>
              <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors">
                ユーザー一覧を表示
              </button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 統計・分析
              </CardTitle>
              <CardDescription>
                問題の正答率や使用状況
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                各問題の統計データと分析結果
              </p>
              <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors">
                統計データを表示
              </button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>システム情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">156</p>
                <p className="text-sm text-gray-600">登録問題数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">89</p>
                <p className="text-sm text-gray-600">登録ユーザー数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">1,247</p>
                <p className="text-sm text-gray-600">総回答数</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* モーダルコンポーネント */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">カテゴリー管理</h2>
              <Button
                variant="outline"
                onClick={() => setShowCategoryManager(false)}
              >
                閉じる
              </Button>
            </div>
            <div className="p-4">
              <CategoryManager onCategoryChange={() => loadAdminData()} />
            </div>
          </div>
        </div>
      )}

      {showConnectionTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">データベース接続テスト</h2>
              <Button
                variant="outline"
                onClick={() => setShowConnectionTest(false)}
              >
                閉じる
              </Button>
            </div>
            <div className="p-4">
              <SupabaseConnectionTest />
            </div>
          </div>
        </div>
      )}

      {showSchemaCheck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">データベース構造チェック</h2>
              <Button
                variant="outline"
                onClick={() => setShowSchemaCheck(false)}
              >
                閉じる
              </Button>
            </div>
            <div className="p-4">
              <DatabaseSchemaCheck />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
