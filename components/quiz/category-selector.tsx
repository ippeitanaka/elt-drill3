"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, BookOpen, Star, Target, Clock } from "lucide-react"
import { Category, QuestionSet } from "@/lib/types"
import { supabase } from "@/lib/supabase"

interface CategorySelectorProps {
  onStartQuiz: (selectedCategories: string[], selectedSets: string[]) => void
}

export function CategorySelector({ onStartQuiz }: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [questionSets, setQuestionSets] = useState<Record<string, QuestionSet[]>>({})
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCategoriesAndSets()
  }, [])

  const fetchCategoriesAndSets = async () => {
    try {
      setLoading(true)
      
      console.log('CategorySelector: API経由でデータ取得開始')
      
      // APIエンドポイントからデータを取得
      const response = await fetch('/api/quiz-categories')
      const result = await response.json()
      
      console.log('CategorySelector: API結果', result)
      
      if (!result.success) {
        throw new Error(result.error || 'API request failed')
      }
      
      const { categories: fetchedCategories, questionSets: groupedSets } = result.data
      
      console.log('CategorySelector: 処理されたデータ', {
        categoriesCount: fetchedCategories.length,
        questionSetsCount: Object.keys(groupedSets).length
      })

      setCategories(fetchedCategories)
      setQuestionSets(groupedSets)
      setLoading(false)
      
      console.log('最終的なカテゴリー一覧:', fetchedCategories.map((c: any) => ({
        name: c.name,
        id: c.id,
        total_questions: c.total_questions,
        question_sets: groupedSets[c.id]?.length || 0
      })))
    } catch (error) {
      console.error("データ取得エラー:", error)
      setLoading(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    const newOpenCategories = new Set(openCategories)
    if (newOpenCategories.has(categoryId)) {
      newOpenCategories.delete(categoryId)
    } else {
      newOpenCategories.add(categoryId)
    }
    setOpenCategories(newOpenCategories)
  }

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newSelectedCategories = new Set(selectedCategories)
    const newSelectedSets = new Set(selectedSets)

    if (checked) {
      newSelectedCategories.add(categoryId)
      // カテゴリーが選択された場合、そのカテゴリーの全てのセットも選択
      const setsInCategory = questionSets[categoryId] || []
      setsInCategory.forEach((set: QuestionSet) => newSelectedSets.add(set.id))
    } else {
      newSelectedCategories.delete(categoryId)
      // カテゴリーが選択解除された場合、そのカテゴリーのセットも解除
      const setsToRemove = questionSets[categoryId]?.map((set: QuestionSet) => set.id) || []
      setsToRemove.forEach((setId: string) => newSelectedSets.delete(setId))
    }

    setSelectedCategories(newSelectedCategories)
    setSelectedSets(newSelectedSets)
  }

  const handleSetChange = (setId: string, categoryId: string, checked: boolean) => {
    const newSelectedSets = new Set(selectedSets)
    const newSelectedCategories = new Set(selectedCategories)

    if (checked) {
      newSelectedSets.add(setId)
      // セットが選択された場合、そのカテゴリーも選択
      newSelectedCategories.add(categoryId)
    } else {
      newSelectedSets.delete(setId)
      // このカテゴリーの他のセットがすべて選択解除されている場合、カテゴリーも解除
      const otherSetsInCategory = questionSets[categoryId]?.filter((set: QuestionSet) => set.id !== setId) || []
      const hasOtherSelectedSets = otherSetsInCategory.some((set: QuestionSet) => newSelectedSets.has(set.id))
      if (!hasOtherSelectedSets) {
        newSelectedCategories.delete(categoryId)
      }
    }

    setSelectedSets(newSelectedSets)
    setSelectedCategories(newSelectedCategories)
  }

  const getSelectedCount = () => {
    let totalQuestions = 0
    selectedCategories.forEach((categoryId: string) => {
      const category = categories.find((c: Category) => c.id === categoryId)
      if (category) {
        totalQuestions += category.total_questions
      }
    })
    return totalQuestions
  }

  const handleStartQuiz = () => {
    onStartQuiz(Array.from(selectedCategories), Array.from(selectedSets))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">カテゴリーを読み込み中...</div>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="text-center p-8">
        <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          カテゴリーが見つかりません
        </h3>
        <p className="text-gray-500">
          管理者がカテゴリーを追加するまでお待ちください。
        </p>
        <div className="mt-4 text-xs text-gray-400">
          デバッグ: カテゴリー数 = {categories.length}
        </div>
      </div>
    )
  }

  // デバッグ: 問題数が0のカテゴリーも表示
  const displayCategories = categories // 元: categories.filter(c => c.total_questions > 0)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">学習カテゴリーを選択</h2>
        <p className="text-gray-600">
          学習したいカテゴリーや問題セットを選んでクイズを開始しましょう
        </p>
      </div>

      <div className="grid gap-4">
        {displayCategories.map((category: Category) => (
          <Card key={category.id} className="overflow-hidden">
            <Collapsible
              open={openCategories.has(category.id)}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedCategories.has(category.id)}
                          onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-2xl">{category.icon}</span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <Target className="h-3 w-3" />
                        <span>{category.total_questions}問</span>
                      </Badge>
                      {openCategories.has(category.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              {questionSets[category.id] && (
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3 pl-8">
                      <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                        <BookOpen className="h-4 w-4" />
                        <span>問題セット</span>
                      </h4>
                      <div className="space-y-2">
                        {questionSets[category.id].map((set: QuestionSet) => (
                          <div
                            key={set.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={selectedSets.has(set.id)}
                                onCheckedChange={(checked) => handleSetChange(set.id, category.id, checked as boolean)}
                              />
                              <div>
                                <p className="font-medium text-gray-900">{set.title}</p>
                                <p className="text-sm text-gray-600">{set.description}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>セット{set.order_index}</span>
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              )}
            </Collapsible>
          </Card>
        ))}
      </div>

      {selectedCategories.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium text-blue-900">
                  選択中: {selectedCategories.size}カテゴリー、{selectedSets.size}セット
                </p>
                <p className="text-sm text-blue-700">
                  約{getSelectedCount()}問の問題が出題されます
                </p>
              </div>
              <Button 
                onClick={handleStartQuiz}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Star className="h-4 w-4 mr-2" />
                クイズを開始
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
