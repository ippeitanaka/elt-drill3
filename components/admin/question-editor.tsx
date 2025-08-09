"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Save, X, Upload } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import type { Question, QuestionSet, Category } from "@/lib/types"

interface QuestionEditorProps {
  categories: Category[]
  onSuccess: () => void
}

interface QuestionFormData {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_e: string
  correct_answer: "A" | "B" | "C" | "D" | "E"
  difficulty: "easy" | "medium" | "hard"
  explanation: string
  order_index: number
}

export function QuestionEditor({ categories, onSuccess }: QuestionEditorProps) {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [selectedQuestionSet, setSelectedQuestionSet] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [bulkImportText, setBulkImportText] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const [questionForm, setQuestionForm] = useState<QuestionFormData>({
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    option_e: "",
    correct_answer: "A",
    difficulty: "medium",
    explanation: "",
    order_index: 1,
  })

  useEffect(() => {
    if (selectedCategory) {
      loadQuestionSets()
    }
  }, [selectedCategory])

  useEffect(() => {
    if (selectedQuestionSet) {
      loadQuestions()
    }
  }, [selectedQuestionSet])

  const loadQuestionSets = async () => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("question_sets")
      .select("*")
      .eq("category_id", selectedCategory)
      .order("order_index")

    if (error) {
      console.error("Error loading question sets:", error)
      return
    }

    setQuestionSets(data || [])
  }

  const loadQuestions = async () => {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("question_set_id", selectedQuestionSet)
      .order("order_index")

    if (error) {
      console.error("Error loading questions:", error)
      return
    }

    setQuestions(data || [])
  }

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      option_e: "",
      correct_answer: "A",
      difficulty: "medium",
      explanation: "",
      order_index: questions.length + 1,
    })
    setEditingQuestion(null)
  }

  const handleEditQuestion = (question: Question) => {
    setQuestionForm({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      option_e: question.option_e || "",
      correct_answer: question.correct_answer as any,
      difficulty: (question.difficulty as any) || "medium",
      explanation: question.explanation || "",
      order_index: question.order_index,
    })
    setEditingQuestion(question)
    setShowQuestionForm(true)
  }

  const handleSaveQuestion = async () => {
    if (!selectedQuestionSet) {
      toast({
        title: "エラー",
        description: "問題セットを選択してください。",
        variant: "destructive",
      })
      return
    }

    if (!questionForm.question_text.trim()) {
      toast({
        title: "エラー",
        description: "問題文を入力してください。",
        variant: "destructive",
      })
      return
    }

    if (
      !questionForm.option_a.trim() ||
      !questionForm.option_b.trim() ||
      !questionForm.option_c.trim() ||
      !questionForm.option_d.trim() ||
      !questionForm.option_e.trim()
    ) {
      toast({
        title: "エラー",
        description: "すべての選択肢（A〜E）を入力してください。",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = getSupabaseClient()
      if (editingQuestion) {
        const { error } = await supabase
          .from("questions")
          .update({
            ...questionForm,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingQuestion.id)

        if (error) throw error

        toast({
          title: "問題を更新しました",
          description: "問題の内容を正常に更新しました。",
        })
      } else {
        const { error } = await supabase.from("questions").insert({
          question_set_id: selectedQuestionSet,
          ...questionForm,
        })

        if (error) throw error

        toast({
          title: "問題を作成しました",
          description: "新しい問題を正常に作成しました。",
        })
      }

      // Update category question count
      await getSupabaseClient().rpc("update_category_question_count", {
        category_id: selectedCategory,
      })

      resetQuestionForm()
      setShowQuestionForm(false)
      loadQuestions()
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

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("この問題を削除しますか？")) return

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("questions").delete().eq("id", questionId)

      if (error) throw error

      toast({
        title: "問題を削除しました",
        description: "問題を正常に削除しました。",
      })

      await getSupabaseClient().rpc("update_category_question_count", {
        category_id: selectedCategory,
      })

      loadQuestions()
      onSuccess()
    } catch (error: any) {
      toast({
        title: "削除エラー",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleBulkImport = async () => {
    if (!selectedQuestionSet || !bulkImportText.trim()) {
      toast({
        title: "エラー",
        description: "問題セットを選択し、インポートデータを入力してください。",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const lines = bulkImportText.trim().split("\n")
      const questionsToImport = [] as any[]

      for (let i = 0; i < lines.length; i += 8) {
        if (i + 7 < lines.length) {
          const question = {
            question_set_id: selectedQuestionSet,
            question_text: lines[i].trim(),
            option_a: lines[i + 1].replace(/^A[.:]?\s*/, "").trim(),
            option_b: lines[i + 2].replace(/^B[.:]?\s*/, "").trim(),
            option_c: lines[i + 3].replace(/^C[.:]?\s*/, "").trim(),
            option_d: lines[i + 4].replace(/^D[.:]?\s*/, "").trim(),
            option_e: lines[i + 5].replace(/^E[.:]?\s*/, "").trim(),
            correct_answer: lines[i + 6].trim().toUpperCase() as "A" | "B" | "C" | "D" | "E",
            explanation: lines[i + 7].trim(),
            difficulty: "medium" as const,
            order_index: Math.floor(i / 8) + 1,
          }

          if (["A", "B", "C", "D", "E"].includes(question.correct_answer)) {
            questionsToImport.push(question)
          }
        }
      }

      if (questionsToImport.length === 0) {
        throw new Error("有効な問題データが見つかりませんでした。")
      }

      const supabase = getSupabaseClient()
      const { error } = await supabase.from("questions").insert(questionsToImport)

      if (error) throw error

      await getSupabaseClient().rpc("update_category_question_count", {
        category_id: selectedCategory,
      })

      toast({
        title: "一括インポート完了",
        description: `${questionsToImport.length}問の問題をインポートしました。`,
      })

      setBulkImportText("")
      loadQuestions()
      onSuccess()
    } catch (error: any) {
      toast({
        title: "インポートエラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getDifficultyBadge = (difficulty: string) => {
    const variants = {
      easy: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      hard: "bg-red-100 text-red-700",
    }
    const labels = { easy: "易", medium: "中", hard: "難" }
    return (
      <Badge className={variants[difficulty as keyof typeof variants]}>
        {labels[difficulty as keyof typeof labels]}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category and Question Set Selection */}
      <Card>
        <CardHeader>
          <CardTitle>問題セット選択</CardTitle>
          <CardDescription>編集する問題セットを選択してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>カテゴリー</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
              <Label>問題セット</Label>
              <Select value={selectedQuestionSet} onValueChange={setSelectedQuestionSet}>
                <SelectTrigger>
                  <SelectValue placeholder="問題セットを選択" />
                </SelectTrigger>
                <SelectContent>
                  {questionSets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedQuestionSet && (
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="questions">問題管理</TabsTrigger>
            <TabsTrigger value="bulk-import">一括インポート</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-6">
            {/* Question List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>問題一覧（5択問題）</CardTitle>
                    <CardDescription>{questions.length}問の問題があります</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      resetQuestionForm()
                      setShowQuestionForm(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    新規問題
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <Card key={question.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">問題 {index + 1}</Badge>
                              {getDifficultyBadge(question.difficulty || 'medium')}
                              <Badge variant="secondary">正解: {question.correct_answer}</Badge>
                            </div>
                            <p className="font-medium mb-3">{question.question_text}</p>
                            <div className="grid grid-cols-1 gap-1 text-sm">
                              <div>A. {question.option_a}</div>
                              <div>B. {question.option_b}</div>
                              <div>C. {question.option_c}</div>
                              <div>D. {question.option_d}</div>
                              <div>E. {question.option_e}</div>
                            </div>
                            {question.explanation && (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                <strong>解説:</strong> {question.explanation}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="outline" size="sm" onClick={() => handleEditQuestion(question)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteQuestion(question.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {questions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      問題がありません。新規問題を作成してください。
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk-import" className="space-y-6">
            {/* Bulk Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  一括インポート（5択問題）
                </CardTitle>
                <CardDescription>複数の5択問題を一度にインポートできます</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>インポートデータ</Label>
                  <Textarea
                    value={bulkImportText}
                    onChange={(e) => setBulkImportText(e.target.value)}
                    placeholder="5択問題データを入力してください..."
                    rows={20}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    各問題は8行で構成してください：問題文、選択肢A、選択肢B、選択肢C、選択肢D、選択肢E、正解、解説
                  </p>
                </div>

                <div className="p-4 bg-gray-50 border rounded-lg">
                  <h4 className="font-medium mb-2">5択問題フォーマット例:</h4>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {`成人の心肺蘇生において、胸骨圧迫の深さはどのくらいが適切ですか？
A. 3-4cm
B. 5-6cm
C. 7-8cm
D. 9-10cm
E. 11-12cm
B
成人のCPRでは胸骨圧迫の深さは5-6cmが推奨されています。

アドレナリンの主な作用機序は何ですか？
A. β受容体遮断
B. α・β受容体刺激
C. カルシウム拮抗
D. ACE阻害
E. 利尿作用
E. 利尿作用
B
アドレナリンはα・β受容体を刺激し、心収縮力増強と血管収縮作用を示します。`}
                  </pre>
                </div>

                <Button onClick={handleBulkImport} disabled={isLoading || !bulkImportText.trim()}>
                  {isLoading ? "インポート中..." : "一括インポート実行"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Question Form Modal */}
      {showQuestionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{editingQuestion ? "5択問題編集" : "新規5択問題作成"}</CardTitle>
                  <CardDescription>5択問題の詳細情報を入力してください</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setShowQuestionForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="question_text">問題文 *</Label>
                <Textarea
                  id="question_text"
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  placeholder="問題文を入力してください"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <Label>選択肢（すべて必須）</Label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="option_a">選択肢A *</Label>
                    <Input
                      id="option_a"
                      value={questionForm.option_a}
                      onChange={(e) => setQuestionForm({ ...questionForm, option_a: e.target.value })}
                      placeholder="選択肢Aを入力"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="option_b">選択肢B *</Label>
                    <Input
                      id="option_b"
                      value={questionForm.option_b}
                      onChange={(e) => setQuestionForm({ ...questionForm, option_b: e.target.value })}
                      placeholder="選択肢Bを入力"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="option_c">選択肢C *</Label>
                    <Input
                      id="option_c"
                      value={questionForm.option_c}
                      onChange={(e) => setQuestionForm({ ...questionForm, option_c: e.target.value })}
                      placeholder="選択肢Cを入力"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="option_d">選択肢D *</Label>
                    <Input
                      id="option_d"
                      value={questionForm.option_d}
                      onChange={(e) => setQuestionForm({ ...questionForm, option_d: e.target.value })}
                      placeholder="選択肢Dを入力"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="option_e">選択肢E *</Label>
                    <Input
                      id="option_e"
                      value={questionForm.option_e}
                      onChange={(e) => setQuestionForm({ ...questionForm, option_e: e.target.value })}
                      placeholder="選択肢Eを入力"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>正解 *</Label>
                  <RadioGroup
                    value={questionForm.correct_answer}
                    onValueChange={(value: "A" | "B" | "C" | "D" | "E") =>
                      setQuestionForm({ ...questionForm, correct_answer: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="A" id="correct_a" />
                      <Label htmlFor="correct_a">A</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B" id="correct_b" />
                      <Label htmlFor="correct_b">B</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="C" id="correct_c" />
                      <Label htmlFor="correct_c">C</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="D" id="correct_d" />
                      <Label htmlFor="correct_d">D</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="E" id="correct_e" />
                      <Label htmlFor="correct_e">E</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>難易度</Label>
                  <Select
                    value={questionForm.difficulty}
                    onValueChange={(value: "easy" | "medium" | "hard") =>
                      setQuestionForm({ ...questionForm, difficulty: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">易</SelectItem>
                      <SelectItem value="medium">中</SelectItem>
                      <SelectItem value="hard">難</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_index">順序</Label>
                  <Input
                    id="order_index"
                    type="number"
                    min={1}
                    value={questionForm.order_index}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, order_index: Number.parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="explanation">解説</Label>
                <Textarea
                  id="explanation"
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="解説を入力してください（オプション）"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveQuestion} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "保存中..." : editingQuestion ? "更新" : "作成"}
                </Button>
                <Button variant="outline" onClick={() => setShowQuestionForm(false)}>
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
