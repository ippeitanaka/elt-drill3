"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Upload, Settings, Users, Database, BarChart, Sparkles, Plus, Edit, Wifi } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { toast } from '@/hooks/use-toast'
import { PDFUploadImproved } from '@/components/admin/pdf-upload-improved'
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

  // Service Role Client (カテゴリーマネージャーと同じクライアントを使用)
  const getSupabaseClient = () => {
    const supabaseUrl = "https://hfanhwznppxngpbjkgno.supabase.co"
    const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW5od3pucHB4bmdwYmprZ25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMwNzQwMSwiZXhwIjoyMDY3ODgzNDAxfQ.A5xIaYlRhjWRv5jT-QdCUB8ThV2u_ufXXnV_o6dZ-a4"
    
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'admin-service-role'
        }
      }
    })
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      console.log('管理画面でカテゴリー取得開始')
      const client = getSupabaseClient()
      
      // カテゴリを取得 (Service Role Clientを使用)
      const { data: categoriesData, error: categoriesError } = await client
        .from('categories')
        .select('*')
        .order('name')

      if (categoriesError) {
        console.error('カテゴリー取得エラー:', categoriesError)
        throw categoriesError
      }

      console.log('管理画面で取得されたカテゴリー:', categoriesData)

      // カテゴリーデータをフォーマット
      const formattedCategories: Category[] = categoriesData?.map(item => ({
        id: item.id,
        name: item.name,
        icon: item.icon || "📚",
        color: item.color || "bg-blue-500",
        description: item.description || "",
        total_questions: 0,
        created_at: item.created_at,
        updated_at: item.created_at
      })) || []

      setCategories(formattedCategories)
      console.log('管理画面でカテゴリー状態更新:', formattedCategories)

      // 統計データを取得（存在しないテーブルはスキップ）
      const questionsResult = await client.from('questions').select('id', { count: 'exact' })
      
      // profilesとquiz_sessionsテーブルは存在しない可能性があるため、エラーを無視
      let usersCount = 0
      let quizzesCount = 0
      
      try {
        const usersResult = await client.from('profiles').select('id', { count: 'exact' })
        usersCount = usersResult.count || 0
      } catch (error) {
        console.log('profilesテーブルが存在しません')
      }
      
      try {
        const quizzesResult = await client.from('quiz_sessions').select('id', { count: 'exact' })
        quizzesCount = quizzesResult.count || 0
      } catch (error) {
        console.log('quiz_sessionsテーブルが存在しません')
      }

      setStats({
        totalQuestions: questionsResult.count || 0,
        totalUsers: usersCount,
        totalQuizzes: quizzesCount,
        categoriesCount: formattedCategories.length
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
                <Upload className="h-5 w-5" />
                PDF問題アップロード
              </CardTitle>
              <CardDescription>
                カテゴリー別に問題PDFと解答PDFをアップロード
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                カテゴリーを選択してPDFファイルをアップロードし、自動的に問題を抽出します
              </p>
              <Button 
                onClick={() => {
                  console.log('PDFアップロードを開く - 現在のカテゴリー:', categories)
                  console.log('カテゴリー数:', categories.length)
                  setShowUpload(true)
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                PDFアップロードを開く
              </Button>
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
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <PDFUploadImproved
            categories={categories}
            onClose={() => setShowUpload(false)}
            onSuccess={() => {
              setShowUpload(false)
              loadAdminData()
            }}
          />
        </div>
      )}

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
