"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, CheckCircle, AlertCircle, FileText, X, Brain, Sparkles, Zap } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import type { Category } from "@/lib/types"
import { processQuizPDFs, convertToLegacyFormat, type ExtractedQuestion, type ParsedQuizData } from "@/lib/ocr"

interface PDFUploadImprovedProps {
  categories: Category[]
  onSuccess: () => void
  onClose: () => void
}

export function PDFUploadImproved({ categories, onSuccess, onClose }: PDFUploadImprovedProps) {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [questionFile, setQuestionFile] = useState<File | null>(null)
  const [answerFile, setAnswerFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<"upload" | "manual" | "complete">("upload")
  const [extractedData, setExtractedData] = useState<ParsedQuizData | null>(null)
  const [manualEdit, setManualEdit] = useState("")

  // デバッグ用のログ
  console.log('PDFUploadImproved - categories:', categories)
  console.log('PDFUploadImproved - selectedCategory:', selectedCategory)

  const handleUpload = async () => {
    if (!selectedCategory) {
      toast({
        title: "カテゴリーが選択されていません",
        description: "問題を分類するカテゴリーを選択してください。",
        variant: "destructive",
      })
      return
    }
    
    if (!questionFile) {
      toast({
        title: "問題ファイルが選択されていません",
        description: "問題PDFファイルを選択してください。",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)

    try {
      // 新しいOCR機能を使用してPDFを処理
      setProgress(20)
      console.log('🧠 拡張OCRでPDF処理を開始...')
      console.log('選択されたカテゴリー:', selectedCategory)
      
      const parsedData: ParsedQuizData = await processQuizPDFs(questionFile, answerFile || undefined)
      
      setProgress(50)
      console.log(`✨ ${parsedData.questions.length}問の問題を抽出しました`)

      setExtractedData(parsedData)

      // データベースに問題を保存
      const questionInserts = parsedData.questions.map((question, index) => ({
        category_id: selectedCategory,
        question_text: question.questionText,
        choices: question.choices,
        correct_answer: question.correctAnswer || 1,
        explanation: question.explanation || '',
        difficulty_level: question.difficulty || 1,
        points: (question.difficulty || 1) * 10
      }))

      setProgress(70)

      const { data, error } = await supabase
        .from('questions')
        .insert(questionInserts)
        .select()

      if (error) {
        throw new Error(`データベース保存エラー: ${error.message}`)
      }

      setProgress(100)

      const answeredQuestions = parsedData.questions.filter(q => q.correctAnswer).length
      
      toast({
        title: "🎉 問題セット作成完了",
        description: `${parsedData.questions.length}問の問題を正常に追加しました！解答率: ${answeredQuestions}/${parsedData.questions.length}`,
      })

      // 手動確認ステップに移行（必要に応じて）
      if (answeredQuestions < parsedData.questions.length) {
        setManualEdit(JSON.stringify(parsedData, null, 2))
        setStep("manual")
      } else {
        setStep("complete")
        setTimeout(() => {
          onSuccess()
        }, 2000)
      }

    } catch (error: any) {
      console.error("PDF処理エラー:", error)
      toast({
        title: "PDF処理エラー",
        description: error.message || "PDFの処理中にエラーが発生しました。",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualSave = async () => {
    if (!extractedData) return

    setIsProcessing(true)

    try {
      // 手動編集されたデータを解析
      const editedData = JSON.parse(manualEdit)
      
      // 不足している解答を補完
      const questionUpdates = editedData.questions.map((question: ExtractedQuestion, index: number) => ({
        category_id: selectedCategory,
        question_text: question.questionText,
        choices: question.choices,
        correct_answer: question.correctAnswer || 1,
        explanation: question.explanation || '',
        difficulty_level: question.difficulty || 1,
        points: (question.difficulty || 1) * 10
      }))

      // 既存の問題を更新
      for (const update of questionUpdates) {
        const { error } = await supabase
          .from('questions')
          .update({
            correct_answer: update.correct_answer,
            explanation: update.explanation
          })
          .eq('category_id', selectedCategory)
          .eq('question_text', update.question_text)
      }

      toast({
        title: "✅ 手動編集完了",
        description: "問題データが正常に更新されました。",
      })

      setStep("complete")
      setTimeout(() => {
        onSuccess()
      }, 2000)

    } catch (error: any) {
      console.error("手動編集エラー:", error)
      toast({
        title: "編集エラー",
        description: "データの更新中にエラーが発生しました。",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setSelectedCategory("")
    setQuestionFile(null)
    setAnswerFile(null)
    setProgress(0)
    setStep("upload")
    setExtractedData(null)
    setManualEdit("")
    setIsProcessing(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            AI強化 PDF問題アップロード
          </CardTitle>
          <CardDescription>
            問題PDFと解答PDFをアップロードして、自動的に問題セットを作成します
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={step} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                アップロード
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                確認・編集
              </TabsTrigger>
              <TabsTrigger value="complete" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                完了
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="category">カテゴリ選択</Label>
                  <div className="space-y-2">
                    {categories && categories.length > 0 ? (
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="カテゴリを選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                <span>{category.icon}</span>
                                <span>{category.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-3 border border-orange-300 bg-orange-50 rounded-md">
                        <p className="text-sm text-orange-800">
                          カテゴリーがまだ作成されていません。
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          まずカテゴリー管理でカテゴリーを作成してください。
                        </p>
                      </div>
                    )}
                    {selectedCategory && (
                      <p className="text-sm text-green-600">
                        選択中: {categories?.find(c => c.id === selectedCategory)?.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="question-file">問題PDF（必須）</Label>
                    <Input
                      id="question-file"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setQuestionFile(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                    {questionFile && (
                      <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {questionFile.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="answer-file">解答PDF（オプション）</Label>
                    <Input
                      id="answer-file"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setAnswerFile(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                    {answerFile && (
                      <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {answerFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">AI強化機能</h4>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• 日本語・英語の混在テキストを高精度で認識</li>
                        <li>• 複数の問題形式に対応（問1、Q1、【1】など）</li>
                        <li>• 選択肢の自動検出と整理</li>
                        <li>• 解答の自動マッチング</li>
                        <li>• 問題難易度の自動推定</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500 animate-pulse" />
                      <span className="text-sm">AI処理中...</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                    <p className="text-xs text-gray-500">
                      {progress < 30 && "PDFを読み込み中..."}
                      {progress >= 30 && progress < 60 && "問題を抽出中..."}
                      {progress >= 60 && progress < 90 && "解答をマッチング中..."}
                      {progress >= 90 && "データベースに保存中..."}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={!selectedCategory || !questionFile || isProcessing || !categories || categories.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Zap className="mr-2 h-4 w-4 animate-spin" />
                      AI処理中...
                    </>
                  ) : !categories || categories.length === 0 ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      カテゴリーが必要です
                    </>
                  ) : !selectedCategory ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      カテゴリーを選択してください
                    </>
                  ) : !questionFile ? (
                    <>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      問題PDFを選択してください
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      AI処理でアップロード開始
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-6">
              <div>
                <Label htmlFor="manual-edit">抽出データの確認・編集</Label>
                <p className="text-sm text-gray-600 mb-2">
                  必要に応じて、解答が不明な問題の正解を追加してください。
                </p>
                <Textarea
                  id="manual-edit"
                  placeholder="抽出されたデータがここに表示されます..."
                  value={manualEdit}
                  onChange={(e) => setManualEdit(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleManualSave} disabled={isProcessing} className="flex-1">
                  {isProcessing ? "保存中..." : "保存して完了"}
                </Button>
                <Button variant="outline" onClick={() => setStep("complete")}>
                  このまま完了
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="complete" className="space-y-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">アップロード完了！</h3>
                <p className="text-gray-600">
                  問題セットが正常に作成されました。
                </p>
                {extractedData && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">抽出問題数:</span>
                        <span className="ml-2">{extractedData.questions.length}問</span>
                      </div>
                      <div>
                        <span className="font-medium">解答済み:</span>
                        <span className="ml-2">
                          {extractedData.questions.filter(q => q.correctAnswer).length}問
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={resetForm} variant="outline" className="flex-1">
                    新しい問題セットを追加
                  </Button>
                  <Button onClick={onClose} className="flex-1">
                    閉じる
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
