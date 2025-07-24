"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, BookOpen, Target } from "lucide-react"
import { Category } from "@/lib/types"

interface CategoryFormData {
  name: string
  description: string
  icon: string
  color: string
}

interface CategoryManagerProps {
  onCategoryChange?: () => void
}

export function CategoryManager({ onCategoryChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    description: "",
    icon: "📚",
    color: "bg-blue-500"
  })
  const [saving, setSaving] = useState(false)
  const [useServiceRole, setUseServiceRole] = useState(false)

  // Service Role Client (RLSをバイパス)
  const getSupabaseClient = () => {
    if (useServiceRole) {
      console.log('Service Role Client を使用')
      const supabaseUrl = "https://hfanhwznppxngpbjkgno.supabase.co"
      const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW5od3pucHB4bmdwYmprZ25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMwNzQwMSwiZXhwIjoyMDY3ODgzNDAxfQ.A5xIaYlRhjWRv5jT-QdCUB8ThV2u_ufXXnV_o6dZ-a4"
      
      return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    } else {
      console.log('通常のクライアントを使用')
      return supabase
    }
  }

  const iconOptions = ["📚", "📝", "📖", "🎧", "✏️", "🗣️", "🔤", "🎯", "⭐", "🏆"]
  const colorOptions = [
    { name: "青", value: "bg-blue-500" },
    { name: "緑", value: "bg-green-500" },
    { name: "紫", value: "bg-purple-500" },
    { name: "赤", value: "bg-red-500" },
    { name: "黄", value: "bg-yellow-500" },
    { name: "インディゴ", value: "bg-indigo-500" },
    { name: "ピンク", value: "bg-pink-500" },
    { name: "シアン", value: "bg-cyan-500" }
  ]

  useEffect(() => {
    // 認証状態を確認
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('現在のユーザー:', user)
      if (!user) {
        console.warn('ユーザーが認証されていません')
      }
    }
    
    checkAuth()
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      console.log('カテゴリー取得開始')
      const client = getSupabaseClient()
      const { data, error } = await client
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('カテゴリー取得エラー:', error)
        return
      }

      console.log('取得されたカテゴリーデータ:', data)

      // Supabaseからのデータを型に合わせて変換
      const formattedCategories: Category[] = data?.map(item => ({
        id: item.id,
        name: item.name,
        icon: item.icon || "📚",
        color: item.color || "bg-blue-500",
        description: item.description || "",
        total_questions: 0, // 後で関連する質問数を取得
        created_at: item.created_at,
        updated_at: item.created_at
      })) || []

      console.log('フォーマット後のカテゴリー:', formattedCategories)
      setCategories(formattedCategories)
      if (onCategoryChange) {
        onCategoryChange()
      }
    } catch (error) {
      console.error('データ取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      console.log('保存開始:', { formData, editingCategory })
      
      if (editingCategory) {
        // 編集
        console.log('編集モード:', editingCategory.id)
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            color: formData.color
          })
          .eq('id', editingCategory.id)

        if (error) {
          console.error('編集エラー:', error)
          throw error
        }
        console.log('編集成功')
      } else {
        // 新規作成
        console.log('新規作成モード')
        const client = getSupabaseClient()
        const { data, error } = await client
          .from('categories')
          .insert({
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            color: formData.color
          })
          .select()

        if (error) {
          console.error('新規作成エラー:', error)
          throw error
        }
        console.log('新規作成成功:', data)
      }

      await fetchCategories()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('保存エラー:', error)
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました'
      alert(`保存に失敗しました: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon,
      color: category.color
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (categoryId: string) => {
    try {
      const client = getSupabaseClient()
      const { error } = await client
        .from('categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      await fetchCategories()
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      icon: "📚",
      color: "bg-blue-500"
    })
    setEditingCategory(null)
  }

  const openNewDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">カテゴリーを読み込み中...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">カテゴリー管理</h2>
          <p className="text-gray-600">学習カテゴリーの追加・編集・削除ができます</p>
          <div className="flex items-center gap-2 mt-2">
            <label className="text-sm font-medium text-gray-700">
              Service Role Client を使用
            </label>
            <button
              onClick={() => setUseServiceRole(!useServiceRole)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useServiceRole ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useServiceRole ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-xs font-medium ${useServiceRole ? 'text-indigo-600' : 'text-gray-500'}`}>
              {useServiceRole ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              新しいカテゴリー
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "カテゴリーを編集" : "新しいカテゴリーを追加"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  カテゴリー名
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 英文法基礎"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="カテゴリーの説明を入力してください"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  アイコン
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`p-2 text-2xl border rounded-md hover:bg-gray-50 ${
                        formData.icon === icon ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カラー
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`p-3 rounded-md ${color.value} ${
                        formData.color === color.value ? 'ring-2 ring-offset-2 ring-gray-600' : ''
                      }`}
                      title={color.name}
                    >
                      <span className="text-white text-xs font-medium">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  {saving ? "保存中..." : editingCategory ? "更新" : "作成"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">カテゴリーがありません</h3>
            <p className="text-gray-500 mb-4">最初のカテゴリーを作成してください</p>
            <Button onClick={openNewDialog} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              カテゴリーを追加
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center text-2xl text-white`}>
                      {category.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{category.name}</h3>
                      <p className="text-gray-600 text-sm">{category.description}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          <Target className="w-3 h-3 mr-1" />
                          {category.total_questions}問
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          作成日: {new Date(category.created_at).toLocaleDateString('ja-JP')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>カテゴリーを削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            「{category.name}」を削除します。この操作は取り消せません。
                            関連する問題も削除される可能性があります。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(category.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            削除する
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
