"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import type { Category } from "@/lib/types"

interface CategoryFormProps {
  category?: Category
  onSuccess: () => void
  onCancel: () => void
}

const iconOptions = [
  { value: "heart-pulse", label: "心拍", emoji: "💓" },
  { value: "pill", label: "薬", emoji: "💊" },
  { value: "bandage", label: "包帯", emoji: "🩹" },
  { value: "lungs", label: "肺", emoji: "🫁" },
  { value: "heart", label: "心臓", emoji: "❤️" },
  { value: "stethoscope", label: "聴診器", emoji: "🩺" },
  { value: "activity", label: "活動", emoji: "📊" },
  { value: "brain", label: "脳", emoji: "🧠" },
]

const colorOptions = [
  { value: "red", label: "赤", class: "bg-red-500" },
  { value: "blue", label: "青", class: "bg-blue-500" },
  { value: "orange", label: "オレンジ", class: "bg-orange-500" },
  { value: "green", label: "緑", class: "bg-green-500" },
  { value: "purple", label: "紫", class: "bg-purple-500" },
  { value: "yellow", label: "黄", class: "bg-yellow-500" },
]

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: category?.name || "",
    description: category?.description || "",
    icon: category?.icon || "heart-pulse",
    color: category?.color || "blue",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (category) {
        // Update existing category
        const { error } = await supabase
          .from("categories")
          .update({
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            color: formData.color,
            updated_at: new Date().toISOString(),
          })
          .eq("id", category.id)

        if (error) throw error

        toast({
          title: "カテゴリーを更新しました",
          description: `${formData.name}の情報を更新しました。`,
        })
      } else {
        // Create new category
        const { error } = await supabase.from("categories").insert({
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
        })

        if (error) throw error

        toast({
          title: "カテゴリーを作成しました",
          description: `${formData.name}を新規作成しました。`,
        })
      }

      onSuccess()
    } catch (error: any) {
      toast({
        title: "エラーが発生しました",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{category ? "カテゴリー編集" : "新規カテゴリー作成"}</CardTitle>
        <CardDescription>
          {category ? "既存のカテゴリー情報を編集します" : "新しい学習カテゴリーを作成します"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">カテゴリー名 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例: 心肺蘇生法"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="カテゴリーの詳細説明を入力してください"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>アイコン</Label>
              <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span>{option.emoji}</span>
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>カラー</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${option.class}`} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>プレビュー</Label>
            <div className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${formData.color}-100`}>
                  <span className="text-lg">
                    {iconOptions.find((opt) => opt.value === formData.icon)?.emoji || "📚"}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold">{formData.name || "カテゴリー名"}</h3>
                  <p className="text-sm text-muted-foreground">{formData.description || "説明文"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? "保存中..." : category ? "更新" : "作成"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
