"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, Save, X, FolderPlus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import type { QuestionSet, Category } from "@/lib/types"

interface QuestionSetManagerProps {
  categories: Category[]
  onSuccess: () => void
}

interface QuestionSetFormData {
  title: string
  description: string
  category_id: string
  order_index: number
  is_active: boolean
}

export function QuestionSetManager({ categories, onSuccess }: QuestionSetManagerProps) {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null)
  const [showSetForm, setShowSetForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [setForm, setSetForm] = useState<QuestionSetFormData>({
    title: "",
    description: "",
    category_id: "",
    order_index: 1,
    is_active: true,
  })

  useEffect(() => {
    loadQuestionSets()
  }, [selectedCategory])

  const loadQuestionSets = async () => {
    let query = supabase
      .from("question_sets")
      .select(`
        *,
        category:categories(name, color),
        questions(id)
      `)
      .order("order_index")

    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error loading question sets:", error)
      return
    }

    setQuestionSets(data || [])
  }

  const resetSetForm = () => {
    setSetForm({
      title: "",
      description: "",
      category_id: selectedCategory || "",
      order_index: questionSets.length + 1,
      is_active: true,
    })
    setEditingSet(null)
  }

  const handleEditSet = (set: QuestionSet) => {
    setSetForm({
      title: set.title,
      description: set.description || "",
      category_id: set.category_id,
      order_index: set.order_index,
      is_active: set.is_active,
    })
    setEditingSet(set)
    setShowSetForm(true)
  }

  const handleSaveSet = async () => {
    if (!setForm.title.trim() || !setForm.category_id) {
      toast({
        title: "エラー",
        description: "タイトルとカテゴリーは必須です。",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      if (editingSet) {
        // Update existing question set
        const { error } = await supabase
          .from("question_sets")
          .update({
            ...setForm,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingSet.id)

        if (error) throw error

        toast({
          title: "問題セットを更新しました",
          description: "問題セットの内容を正常に更新しました。",
        })
      } else {
        // Create new question set
        const { error } = await supabase.from("question_sets").insert(setForm)

        if (error) throw error

        toast({
          title: "問題セットを作成しました",
          description: "新しい問題セットを正常に作成しました。",
        })
      }

      resetSetForm()
      setShowSetForm(false)
      loadQuestionSets()
      onSuccess()
    } catch (error: any) {
      toast({
        title: "保存エラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSet = async (setId: string) => {
    if (!confirm("この問題セットを削除しますか？関連する問題もすべて削除されます。")) return

    try {
      const { error } = await supabase.from("question_sets").delete().eq("id", setId)

      if (error) throw error

      toast({
        title: "問題セットを削除しました",
        description: "問題セットと関連する問題を正常に削除しました。",
      })

      loadQuestionSets()
      onSuccess()
    } catch (error: any) {
      toast({
        title: "削除エラー",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (setId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("question_sets")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("id", setId)

      if (error) throw error

      toast({
        title: isActive ? "問題セットを有効化しました" : "問題セットを無効化しました",
        description: "問題セットの状態を変更しました。",
      })

      loadQuestionSets()
    } catch (error: any) {
      toast({
        title: "更新エラー",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Category Filter and Create Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>問題セット管理</CardTitle>
              <CardDescription>問題セットの作成・編集・管理を行います</CardDescription>
            </div>
            <Button
              onClick={() => {
                resetSetForm()
                setShowSetForm(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              新規問題セット
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>カテゴリーフィルター</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="すべてのカテゴリー" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのカテゴリー</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Question Sets List */}
      <div className="grid gap-4">
        {questionSets.map((set) => (
          <Card key={set.id} className={!set.is_active ? "opacity-60" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{set.title}</h3>
                    <Badge
                      variant="outline"
                      className={`bg-${set.category?.color || "blue"}-100 text-${set.category?.color || "blue"}-700`}
                    >
                      {set.category?.name}
                    </Badge>
                    <Badge variant={set.is_active ? "default" : "secondary"}>{set.is_active ? "有効" : "無効"}</Badge>
                    <Badge variant="outline">{set.questions?.length || 0}問</Badge>
                  </div>
                  {set.description && <p className="text-muted-foreground mb-3">{set.description}</p>}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>順序: {set.order_index}</span>
                    <span>作成日: {new Date(set.created_at).toLocaleDateString("ja-JP")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={set.is_active}
                      onCheckedChange={(checked) => handleToggleActive(set.id, checked)}
                    />
                    <Label className="text-sm">有効</Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEditSet(set)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteSet(set.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {questionSets.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <FolderPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {selectedCategory ? "選択されたカテゴリーに問題セットがありません" : "問題セットがありません"}
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  resetSetForm()
                  setShowSetForm(true)
                }}
              >
                最初の問題セットを作成
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Question Set Form Modal */}
      {showSetForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{editingSet ? "問題セット編集" : "新規問題セット作成"}</CardTitle>
                  <CardDescription>問題セットの詳細情報を入力してください</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setShowSetForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">タイトル *</Label>
                <Input
                  id="title"
                  value={setForm.title}
                  onChange={(e) => setSetForm({ ...setForm, title: e.target.value })}
                  placeholder="例: BLS基礎"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={setForm.description}
                  onChange={(e) => setSetForm({ ...setForm, description: e.target.value })}
                  placeholder="問題セットの詳細説明を入力してください"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>カテゴリー *</Label>
                  <Select
                    value={setForm.category_id}
                    onValueChange={(value) => setSetForm({ ...setForm, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="カテゴリーを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_index">表示順序</Label>
                  <Input
                    id="order_index"
                    type="number"
                    min={1}
                    value={setForm.order_index}
                    onChange={(e) => setSetForm({ ...setForm, order_index: Number.parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={setForm.is_active}
                  onCheckedChange={(checked) => setSetForm({ ...setForm, is_active: checked })}
                />
                <Label htmlFor="is_active">問題セットを有効にする</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveSet} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "保存中..." : editingSet ? "更新" : "作成"}
                </Button>
                <Button variant="outline" onClick={() => setShowSetForm(false)}>
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
