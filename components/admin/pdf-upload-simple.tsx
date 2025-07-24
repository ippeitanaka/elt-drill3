"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Upload, CheckCircle, AlertCircle, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import type { Category } from "@/lib/types"

interface PDFUploadSimpleProps {
  categories: Category[]
  onSuccess: () => void
}

interface ParsedQuestion {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_e: string
  correct_answer?: "A" | "B" | "C" | "D" | "E"
}

export function PDFUploadSimple({ categories, onSuccess }: PDFUploadSimpleProps) {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [questionFile, setQuestionFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<"upload" | "manual" | "complete">("upload")
  const [manualQuestions, setManualQuestions] = useState("")

  // 簡単なテキスト解析（デモ用）
  const parseManualQuestions = (text: string): ParsedQuestion[] => {
    const questions: ParsedQuestion[] = []
    const lines = text
      .trim()
      .split("\n")
      .filter((line) => line.trim())

    // 8行ずつ処理（問題文 + 5択 + 正解 + 解説）
    for (let i = 0; i < lines.length; i += 8) {
      if (i + 6 < lines.length) {
        const question: ParsedQuestion = {
          question_text: lines[i].trim(),
          option_a: lines[i + 1].replace(/^A[.:]?\s*/, "").trim(),
          option_b: lines[i + 2].replace(/^B[.:]?\s*/, "").trim(),
          option_c: lines[i + 3].replace(/^C[.:]?\s*/, "").trim(),
          option_d: lines[i + 4].replace(/^D[.:]?\s*/, "").trim(),
          option_e: lines[i + 5].replace(/^E[.:]?\s*/, "").trim(),
          correct_answer: lines[i + 6].trim().toUpperCase() as "A" | "B" | "C" | "D" | "E",
        }

        if (question.question_text && question.option_a && question.option_e) {
          questions.push(question)
        }
      }
    }

    return questions
  }

  const handleFileUpload = async () => {
    if (!selectedCategory || !questionFile) {
      toast({
        title: "必要な情報が不足しています",
        description: "カテゴリーと問題ファイルを選択してください。",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)

    try {
      // Step 1: ファイルをSupabaseストレージにアップロード
      setProgress(30)
      const fileName = `questions_${Date.now()}_${questionFile.name}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(fileName, questionFile)

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw new Error(`ファイルアップロードエラー: ${uploadError.message}`)
      }

      setProgress(60)

      // Step 2: アップロード記録を保存
      const { data: user } = await supabase.auth.getUser()

      const { error: recordError } = await supabase.from("pdf_uploads").insert({
        category_id: selectedCategory,
        file_name: questionFile.name,
        file_url: uploadData.path,
        file_type: "questions",
        file_size: questionFile.size,
        uploaded_by: user.user?.id,
        is_processed: false,
      })

      if (recordError) {
        console.error("Record error:", recordError)
        throw new Error(`記録保存エラー: ${recordError.message}`)
      }

      setProgress(100)

      toast({
        title: "ファイルアップロード完了",
        description: "PDFファイルが正常にアップロードされました。手動で問題を入力してください。",
      })

      setStep("manual")
    } catch (error: any) {
      console.error("Upload process error:", error)
      toast({
        title: "アップロードエラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualSave = async () => {
    if (!selectedCategory || !manualQuestions.trim()) {
      toast({
        title: "データが不足しています",
        description: "問題データを入力してください。",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const questions = parseManualQuestions(manualQuestions)

      if (questions.length === 0) {
        throw new Error("有効な問題データが見つかりませんでした。")
      }

      // 問題セットを作成
      const category = categories.find((c) => c.id === selectedCategory)
      const { data: questionSet, error: setError } = await supabase
        .from("question_sets")
        .insert({
          category_id: selectedCategory,
          title: `手動入力 - ${new Date().toLocaleDateString("ja-JP")}`,
          description: `${category?.name}の問題セット（手動入力）`,
          order_index: 1,
        })
        .select()
        .single()

      if (setError) throw setError

      // 問題を挿入
      const questionsToInsert = questions.map((q, index) => ({
        question_set_id: questionSet.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        option_e: q.option_e,
        correct_answer: q.correct_answer || "A",
        difficulty: "medium" as const,
        order_index: index + 1,
      }))

      const { error: questionsError } = await supabase.from("questions").insert(questionsToInsert)

      if (questionsError) throw questionsError

      // カテゴリーの問題数を更新
      await supabase.rpc("update_category_question_count", {
        category_id: selectedCategory,
      })

      toast({
        title: "問題を保存しました",
        description: `${questions.length}問をデータベースに保存しました。`,
      })

      setStep("complete")
      onSuccess()
    } catch (error: any) {
      toast({
        title: "保存エラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setSelectedCategory("")
    setQuestionFile(null)
    setManualQuestions("")
    setStep("upload")
    setProgress(0)
  }

  if (step === "complete") {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">問題登録完了</h3>
          <p className="text-muted-foreground mb-6">問題が正常に保存されました。</p>
          <Button onClick={resetForm}>新しい問題を追加</Button>
        </CardContent>
      </Card>
    )
  }

  if (step === "manual") {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>問題データ入力</CardTitle>
          <CardDescription>5択問題のデータを手動で入力してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">入力フォーマット（8行で1問）:</h4>
            <pre className="text-xs text-blue-700 whitespace-pre-wrap">
              {`問題文
A. 選択肢A
B. 選択肢B  
C. 選択肢C
D. 選択肢D
E. 選択肢E
B
解説（オプション）`}
            </pre>
          </div>

          <div className="space-y-2">
            <Label>問題データ</Label>
            <Textarea
              value={manualQuestions}
              onChange={(e) => setManualQuestions(e.target.value)}
              placeholder="上記のフォーマットに従って問題データを入力してください..."
              rows={20}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleManualSave} disabled={isProcessing}>
              {isProcessing ? "保存中..." : "問題を保存"}
            </Button>
            <Button variant="outline" onClick={() => setStep("upload")}>
              戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          問題アップロード（簡易版）
        </CardTitle>
        <CardDescription>PDFファイルをアップロードして手動で問題を入力します</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>処理中...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="space-y-2">
          <Label>カテゴリー *</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isProcessing}>
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
          <Label htmlFor="questionFile">問題ファイル *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="questionFile"
              type="file"
              accept=".pdf,.txt,.docx"
              onChange={(e) => setQuestionFile(e.target.files?.[0] || null)}
              disabled={isProcessing}
            />
            {questionFile && <CheckCircle className="h-4 w-4 text-green-600" />}
          </div>
          <p className="text-xs text-muted-foreground">PDF、テキスト、Wordファイルに対応</p>
        </div>

        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            現在は簡易版です。ファイルをアップロード後、手動で問題データを入力してください。
          </p>
        </div>

        <Button
          onClick={handleFileUpload}
          disabled={!selectedCategory || !questionFile || isProcessing}
          className="w-full"
        >
          {isProcessing ? "アップロード中..." : "ファイルをアップロード"}
        </Button>

        <div className="border-t pt-4">
          <Button variant="outline" onClick={() => setStep("manual")} className="w-full bg-transparent">
            <FileText className="h-4 w-4 mr-2" />
            ファイルなしで直接入力
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
