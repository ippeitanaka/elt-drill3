"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Upload, Settings, Users, Database, BarChart, Sparkles, Plus, Edit, Wifi } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { PDFUploadImproved } from '@/components/admin/pdf-upload-improved'
import SimpleCategoryManager from '@/components/admin/simple-category-manager'
import { SupabaseConnectionTest } from '@/components/admin/supabase-connection-test'
import { DatabaseSchemaCheck } from '@/components/admin/database-schema-check'
import type { Category } from '@/lib/types'

export default function AdminPage() {
  const supabase = getSupabaseClient()
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
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login' // 未認証の場合はログインページへリダイレクト
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        window.location.href = '/' // 管理者でない場合はホームページへリダイレクト
      }
    }

    // 認証チェックを一時的に無効化（開発用）
    // checkAuth()
  }, [supabase])

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      console.log('管理画面でカテゴリー取得開始')
      
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (categoriesError) {
        console.error('カテゴリー取得エラー:', categoriesError)
        throw categoriesError
      }

      const formattedCategories: Category[] = categoriesData?.map(item => ({
        id: String(item.id),
        name: String(item.name),
        icon: String(item.icon || '📚'), // デフォルトアイコン
        color: String(item.color || 'red'), // デフォルト色
        description: String(item.description || `${item.name}に関する問題`), // デフォルト説明
        total_questions: Number(item.total_questions || 0), // デフォルト0
        created_at: String(item.created_at),
        updated_at: String(item.updated_at || item.created_at), // created_atをフォールバック
      })) || []

      setCategories(formattedCategories)

      const questionsResult = await supabase.from('questions').select('id', { count: 'exact' })
      let usersCount = 0
      let quizzesCount = 0
      
      try {
        const usersResult = await supabase.from('profiles').select('id', { count: 'exact' })
        usersCount = usersResult.count || 0
      } catch (error) {
        console.log('profilesテーブルが存在しません')
      }
      
      try {
        // quiz_sessionsテーブルの代わりに、question_setsテーブルの数を使用
        const quizzesResult = await supabase.from('question_sets').select('id', { count: 'exact' })
        quizzesCount = quizzesResult.count || 0
      } catch (error) {
        console.log('question_setsテーブルから情報を取得できませんでした')
        quizzesCount = 0
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
    <main className="min-h-screen p-8 bg-gradient-to-b from-red-50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-red-600 hover:text-red-800 mb-4 inline-block">
            ← ホームに戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🔧 管理画面</h1>
          <p className="text-xl text-gray-600">救急救命士国家試験問題の管理と設定</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                PDF問題アップロード
              </CardTitle>
              <CardDescription>
                カテゴリー別に国家試験問題PDFと解答PDFをアップロード
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                カテゴリーを選択してPDFファイルをアップロードし、自動的に問題を抽出します
              </p>
              <Button 
                onClick={() => {
                  setShowUpload(true)
                }}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                PDFアップロードを開く
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                カテゴリー管理
              </CardTitle>
              <CardDescription>
                学習分野（基礎医学、救急医学等）の追加・編集・削除
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                問題のカテゴリーを管理し、整理する
              </p>
              <Button 
                onClick={() => setShowCategoryManager(true)}
                className="w-full bg-orange-600 hover:bg-orange-700"
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
                className="w-full bg-green-600 hover:bg-green-700"
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
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Database className="h-4 w-4 mr-2" />
                スキーマをチェック
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>システム情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.totalQuestions}</p>
                <p className="text-sm text-gray-600">登録問題数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.totalUsers}</p>
                <p className="text-sm text-gray-600">学習者数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.totalQuizzes}</p>
                <p className="text-sm text-gray-600">総受験回数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.categoriesCount}</p>
                <p className="text-sm text-gray-600">カテゴリー数</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* モーダルコンポーネント */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <PDFUploadImproved
            categories={[]} // 空配列に変更（コンポーネント内で取得）
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
              <SimpleCategoryManager />
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
