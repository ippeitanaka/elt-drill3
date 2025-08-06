"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Upload, Settings, Users, Database, BarChart, Sparkles, Plus, Edit, Wifi } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { PDFUploadImproved } from '@/components/admin/pdf-upload-improved'
import { CategoryManager } from '@/components/admin/category-manager'
import { SupabaseConnectionTest } from '@/components/admin/supabase-connection-test'
import { DatabaseSchemaCheck } from '@/components/admin/database-schema-check'
import type { Category } from '@/lib/types'

export default function AdminPageComponent() {
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

    checkAuth()
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
        icon: String(item.icon),
        color: String(item.color),
        description: String(item.description),
        total_questions: Number(item.total_questions),
        created_at: String(item.created_at),
        updated_at: String(item.updated_at),
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
        const quizzesResult = await supabase.from('quiz_sessions').select('id', { count: 'exact' })
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
        </div>
      </div>

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
