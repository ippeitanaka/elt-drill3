'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"

const iconOptions = ["📚", "📝", "📖", "🎧", "✏️", "🗣️", "🔤", "🎯", "⭐", "🏆"]
const colorOptions = ["red", "blue", "green", "purple", "orange", "pink", "indigo", "gray"]

interface Category {
  id: number
  name: string
  description: string
  icon: string
  color: string
  question_count?: number
}

interface EditState {
  id: number | null
  name: string
  description: string
  icon: string
  color: string
}

export default function SimpleCategoryManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    icon: '📚',
    color: 'red'
  })
  const [editState, setEditState] = useState<EditState>({
    id: null,
    name: '',
    description: '',
    icon: '',
    color: ''
  })
  const [isCreating, setIsCreating] = useState(false)
  const [toast, setToast] = useState<{type: 'success' | 'error', message: string} | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
  }

  const loadCategories = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/categories')
      const result = await response.json()
      
      if (result.success) {
        setCategories(result.categories)
      } else {
        showToast('error', result.error || 'カテゴリーの読み込みに失敗しました')
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      showToast('error', 'カテゴリーの読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      showToast('error', 'カテゴリー名を入力してください')
      return
    }

    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCategory)
      })
      
      const result = await response.json()
      
      if (result.success) {
        setCategories([...categories, result.category])
        setNewCategory({ name: '', description: '', icon: '📚', color: 'red' })
        setIsCreating(false)
        showToast('success', result.message)
      } else {
        showToast('error', result.error || 'カテゴリーの作成に失敗しました')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      showToast('error', 'カテゴリーの作成中にエラーが発生しました')
    }
  }

  const handleUpdateCategory = async () => {
    if (!editState.name.trim()) {
      showToast('error', 'カテゴリー名を入力してください')
      return
    }

    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editState)
      })
      
      const result = await response.json()
      
      if (result.success) {
        setCategories(categories.map(cat => 
          cat.id === editState.id ? result.category : cat
        ))
        setEditState({ id: null, name: '', description: '', icon: '', color: '' })
        showToast('success', result.message)
      } else {
        showToast('error', result.error || 'カテゴリーの更新に失敗しました')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      showToast('error', 'カテゴリーの更新中にエラーが発生しました')
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('このカテゴリーを削除しますか？関連する問題がある場合は削除できません。')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/categories?id=${id}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        setCategories(categories.filter(cat => cat.id !== id))
        showToast('success', result.message)
      } else {
        showToast('error', result.error || 'カテゴリーの削除に失敗しました')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      showToast('error', 'カテゴリーの削除中にエラーが発生しました')
    }
  }

  const startEdit = (category: Category) => {
    setEditState({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color
    })
  }

  const cancelEdit = () => {
    setEditState({ id: null, name: '', description: '', icon: '', color: '' })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>カテゴリー管理</CardTitle>
          <CardDescription>問題のカテゴリーを管理します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">読み込み中...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Alert className={toast.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
          <AlertDescription className={toast.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {toast.message}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>カテゴリー管理</CardTitle>
          <CardDescription>問題のカテゴリーを管理します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">カテゴリー一覧</h3>
            <Button
              onClick={() => setIsCreating(!isCreating)}
              variant={isCreating ? "outline" : "default"}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreating ? "キャンセル" : "新規作成"}
            </Button>
          </div>

          {isCreating && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">新しいカテゴリー</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">カテゴリー名</label>
                  <Input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    placeholder="カテゴリー名を入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">説明</label>
                  <Input
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                    placeholder="説明を入力（省略可能）"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">アイコン</label>
                    <select
                      value={newCategory.icon}
                      onChange={(e) => setNewCategory({...newCategory, icon: e.target.value})}
                      className="w-full p-2 border rounded-md"
                    >
                      {iconOptions.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">色</label>
                    <select
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                      className="w-full p-2 border rounded-md"
                    >
                      {colorOptions.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateCategory}>作成</Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardContent className="p-4">
                  {editState.id === category.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">カテゴリー名</label>
                        <Input
                          value={editState.name}
                          onChange={(e) => setEditState({...editState, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">説明</label>
                        <Input
                          value={editState.description}
                          onChange={(e) => setEditState({...editState, description: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">アイコン</label>
                          <select
                            value={editState.icon}
                            onChange={(e) => setEditState({...editState, icon: e.target.value})}
                            className="w-full p-2 border rounded-md"
                          >
                            {iconOptions.map(icon => (
                              <option key={icon} value={icon}>{icon}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">色</label>
                          <select
                            value={editState.color}
                            onChange={(e) => setEditState({...editState, color: e.target.value})}
                            className="w-full p-2 border rounded-md"
                          >
                            {colorOptions.map(color => (
                              <option key={color} value={color}>{color}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleUpdateCategory} size="sm">
                          <Check className="w-4 h-4 mr-1" />
                          保存
                        </Button>
                        <Button variant="outline" onClick={cancelEdit} size="sm">
                          <X className="w-4 h-4 mr-1" />
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <h4 className="font-medium">{category.name}</h4>
                          <p className="text-sm text-gray-600">{category.description}</p>
                          <p className="text-xs text-gray-500">問題数: {category.question_count || 0}</p>
                        </div>
                        <Badge variant="secondary" className={`bg-${category.color}-100 text-${category.color}-800`}>
                          {category.color}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(category)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              カテゴリーがありません。新規作成してください。
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
