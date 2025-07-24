"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileText, Users, BarChart3, Plus, Edit, Trash2, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"
import type { Category, User, PDFUpload, StudySession } from "@/lib/types"
import { AuthForm } from "@/components/auth/auth-form"
import { CategoryForm } from "@/components/admin/category-form"
import { toast } from "sonner"

import { PDFUploadImproved } from "@/components/admin/pdf-upload-improved"
import { UserManagement } from "@/components/admin/user-management"
import { RoleGuard } from "@/components/auth/role-guard"

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [uploads, setUploads] = useState<PDFUpload[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [showPDFUpload, setShowPDFUpload] = useState(false)

  useEffect(() => {
    checkUserAndLoadData()
  }, [])

  const checkUserAndLoadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      if (currentUser?.role === "admin") {
        await Promise.all([loadCategories(), loadUploads(), loadSessions()])
      }
    } catch (error) {
      console.error("Error loading admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) {
      console.error("Error loading categories:", error)
      return
    }

    setCategories(data || [])
  }

  const loadUploads = async () => {
    const { data, error } = await supabase
      .from("pdf_uploads")
      .select(`
        *,
        category:categories(name),
        uploader:users(name)
      `)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Error loading uploads:", error)
      return
    }

    setUploads(data || [])
  }

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("study_sessions")
      .select(`
        *,
        user:users(name),
        question_set:question_sets(
          title,
          category:categories(name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Error loading sessions:", error)
      return
    }

    setSessions(data || [])
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("このカテゴリーを削除しますか？関連する問題もすべて削除されます。")) {
      return
    }

    try {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId)
      if (error) throw error

      toast("カテゴリーを削除しました")
      loadCategories()
    } catch (error: any) {
      toast(`削除エラー: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">アクセス拒否</h1>
            <p className="text-muted-foreground mt-2">管理者権限が必要です。</p>
          </div>
        </div>
      </div>
    )
  }

  const totalQuestions = categories.reduce((sum, cat) => sum + cat.total_questions, 0)
  const totalSessions = sessions.length
  const averageScore =
    sessions.length > 0 ? Math.round(sessions.reduce((sum, session) => sum + session.score, 0) / sessions.length) : 0

  return (
    <RoleGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="container py-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">管理画面</h1>
              <p className="text-muted-foreground">コンテンツ管理とユーザー分析</p>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">総問題数</p>
                  <p className="text-2xl font-bold">{totalQuestions}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">カテゴリー数</p>
                  <p className="text-2xl font-bold">{categories.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mr-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">学習セッション</p>
                  <p className="text-2xl font-bold">{totalSessions}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mr-4">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">平均スコア</p>
                  <p className="text-2xl font-bold">{averageScore}点</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="categories" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="categories">カテゴリー</TabsTrigger>
              <TabsTrigger value="uploads">問題追加</TabsTrigger>
              <TabsTrigger value="analytics">分析</TabsTrigger>
              <TabsTrigger value="settings">設定</TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">カテゴリー管理</h2>
                <Button className="flex items-center gap-2" onClick={() => setShowCategoryForm(true)}>
                  <Plus className="h-4 w-4" />
                  新規カテゴリー
                </Button>
              </div>

              <div className="grid gap-4">
                {categories.map((category) => (
                  <Card key={category.id}>
                    <CardContent className="flex items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-lg bg-${category.color}-100 flex items-center justify-center`}
                        >
                          <span className="text-2xl">📚</span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                          <Badge variant="secondary" className="mt-1">
                            {category.total_questions}問
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCategory(category)
                            setShowCategoryForm(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="uploads" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">問題追加</h2>
                <Button className="flex items-center gap-2" onClick={() => setShowPDFUpload(true)}>
                  <Upload className="h-4 w-4" />
                  問題・解答を追加
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>問題追加の方法</CardTitle>
                  <CardDescription>以下の方法で問題を追加できます</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">📄 ファイルアップロード</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        問題ファイルと解答ファイルをアップロードして手動で問題を入力
                      </p>
                      <Button size="sm" onClick={() => setShowPDFUpload(true)}>
                        ファイルをアップロード
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">✏️ 直接入力</h4>
                      <p className="text-sm text-muted-foreground mb-3">ファイルなしで直接問題データを入力</p>
                      <Button size="sm" variant="outline" onClick={() => setShowPDFUpload(true)}>
                        直接入力
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">✅ 改善点</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• 問題ファイルと解答ファイルの両方をアップロード可能</li>
                      <li>• 日本語ファイル名の自動変換でエラーを回避</li>
                      <li>• 解答データの自動マッチング機能</li>
                      <li>• より柔軟な解答フォーマット対応</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>最近の追加</CardTitle>
                  <CardDescription>最近追加された問題・解答ファイル</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {uploads.length > 0 ? (
                      uploads.map((upload) => (
                        <div key={upload.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium">{upload.file_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {upload.category?.name} • {upload.file_type === "questions" ? "問題" : "解答"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={upload.is_processed ? "default" : "secondary"}>
                              {upload.is_processed ? "処理済み" : "処理中"}
                            </Badge>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">まだ問題が追加されていません</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <h2 className="text-2xl font-bold">学習分析</h2>

              <Card>
                <CardHeader>
                  <CardTitle>最近の学習セッション</CardTitle>
                  <CardDescription>ユーザーの学習活動と成績</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sessions.length > 0 ? (
                      sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">{session.user?.name?.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-medium">{session.user?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {session.question_set?.category?.name} • {session.question_set?.title}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                session.score >= 80 ? "default" : session.score >= 60 ? "secondary" : "destructive"
                              }
                            >
                              {session.score}点
                            </Badge>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.created_at).toLocaleDateString("ja-JP")}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">学習セッションがありません</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <UserManagement />
            </TabsContent>
          </Tabs>
        </main>

        {/* Category Form Dialog */}
        {showCategoryForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <CategoryForm
              category={editingCategory}
              onSuccess={() => {
                setShowCategoryForm(false)
                setEditingCategory(null)
                loadCategories()
              }}
              onCancel={() => {
                setShowCategoryForm(false)
                setEditingCategory(null)
              }}
            />
          </div>
        )}

        {/* PDF Upload Dialog */}
        {showPDFUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <PDFUploadImproved
              categories={categories}
              onSuccess={() => {
                setShowPDFUpload(false)
                loadUploads()
                loadCategories()
              }}
              onClose={() => setShowPDFUpload(false)}
            />
          </div>
        )}
      </div>
    </RoleGuard>
  )
}
