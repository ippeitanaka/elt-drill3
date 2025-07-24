"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, CheckCircle, Eye, Bug } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { parseQuestionsPDF, parseAnswersPDF, matchQuestionsWithAnswers, debugPDFText } from "@/lib/ocr"
import { toast } from "@/hooks/use-toast"
import type { Category, ParsedQuestion } from "@/lib/types"

interface PDFUploadProps {
  categories: Category[]
  onSuccess: () => void
}

export function PDFUpload({ categories, onSuccess }: PDFUploadProps) {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [questionFile, setQuestionFile] = useState<File | null>(null)
  const [answerFile, setAnswerFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [step, setStep] = useState<"upload" | "preview" | "complete">("upload")
  const [debugText, setDebugText] = useState("")
  const [showDebug, setShowDebug] = useState(false)

  const handleFileUpload = async () => {
    if (!selectedCategory || !questionFile) {
      toast({
        title: "必要な情報が不足しています",
        description: "カテゴリーと問題PDFを選択してください。",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)

    try {
      // Step 1: Upload files to Supabase Storage
      setProgress(20)
      const questionFileName = `questions_${Date.now()}_${questionFile.name}`
      const { data: questionUpload, error: questionError } = await supabase.storage
        .from("pdfs")
        .upload(questionFileName, questionFile)

      if (questionError) throw questionError

      let answerUpload = null
      if (answerFile) {
        const answerFileName = `answers_${Date.now()}_${answerFile.name}`
        const { data: upload, error } = await supabase.storage.from("pdfs").upload(answerFileName, answerFile)
        if (error) throw error
        answerUpload = upload
      }

      // Step 2: Parse PDFs using OCR
      setProgress(40)
      toast({
        title: "PDF解析中",
        description: "OCRを使用してPDFを解析しています...",
      })

      const questions = await parseQuestionsPDF(questionFile)

      setProgress(60)
      let finalQuestions = questions
      if (answerFile) {
        toast({
          title: "解答解析中",
          description: "解答PDFを解析しています...",
        })
        const answers = await parseAnswersPDF(answerFile)
        finalQuestions = matchQuestionsWithAnswers(questions, answers)
      }

      // Step 3: Save upload records
      setProgress(80)
      const { data: user } = await supabase.auth.getUser()

      await supabase.from("pdf_uploads").insert([
        {
          category_id: selectedCategory,
          file_name: questionFile.name,
          file_url: questionUpload.path,
          file_type: "questions",
          file_size: questionFile.size,
          uploaded_by: user.user?.id,
          is_processed: true,
        },
        ...(answerUpload
          ? [
              {
                category_id: selectedCategory,
                file_name: answerFile!.name,
                file_url: answerUpload.path,
                file_type: "answers" as const,
                file_size: answerFile!.size,
                uploaded_by: user.user?.id,
                is_processed: true,
              },
            ]
          : []),
      ])

      setProgress(100)
      setParsedQuestions(finalQuestions)
      setStep("preview")

      toast({
        title: "PDF解析完了",
        description: `${finalQuestions.length}問の問題を解析しました。`,
      })
    } catch (error: any) {
      toast({
        title: "アップロードエラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDebugPDF = async () => {
    if (!questionFile) {
      toast({
        title: "ファイルが選択されていません",
        description: "デバッグするPDFファイルを選択してください。",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      toast({
        title: "デバッグ開始",
        description: "PDFファイルを解析しています...",
      })
      
      const text = await debugPDFText(questionFile)
      setDebugText(text)
      setShowDebug(true)
      
      toast({
        title: "デバッグ完了",
        description: "PDFから抽出されたテキストを確認できます。",
      })
    } catch (error: any) {
      toast({
        title: "デバッグエラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveQuestions = async () => {
    if (!selectedCategory || parsedQuestions.length === 0) return

    setIsProcessing(true)

    try {
      // Create a question set
      const category = categories.find((c) => c.id === selectedCategory)
      const { data: questionSet, error: setError } = await supabase
        .from("question_sets")
        .insert({
          category_id: selectedCategory,
          title: `PDFインポート - ${new Date().toLocaleDateString("ja-JP")}`,
          description: `${category?.name}の問題セット（PDF解析）`,
          order_index: 1,
        })
        .select()
        .single()

      if (setError) throw setError

      // Insert questions
      const questionsToInsert = parsedQuestions.map((q, index) => ({
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

      // Update category question count
      const { error: updateError } = await supabase.rpc("update_category_question_count", {
        category_id: selectedCategory,
      })

      if (updateError) console.warn("Failed to update question count:", updateError)

      setStep("complete")
      toast({
        title: "問題を保存しました",
        description: `${parsedQuestions.length}問をデータベースに保存しました。`,
      })

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
    setAnswerFile(null)
    setParsedQuestions([])
    setStep("upload")
    setProgress(0)
    setDebugText("")
    setShowDebug(false)
  }

  if (step === "complete") {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">アップロード完了</h3>
          <p className="text-muted-foreground mb-6">{parsedQuestions.length}問の問題を正常に保存しました。</p>
          <Button onClick={resetForm}>新しいPDFをアップロード</Button>
        </CardContent>
      </Card>
    )
  }

  if (step === "preview") {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>解析結果プレビュー</CardTitle>
          <CardDescription>解析された5択問題を確認してください。必要に応じて編集できます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Badge variant="outline">{parsedQuestions.length}問解析済み</Badge>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                戻る
              </Button>
              <Button onClick={handleSaveQuestions} disabled={isProcessing}>
                {isProcessing ? "保存中..." : "問題を保存"}
              </Button>
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {parsedQuestions.map((question, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">問題 {index + 1}</Badge>
                    {question.correct_answer && <Badge variant="secondary">正解: {question.correct_answer}</Badge>}
                  </div>
                  <p className="font-medium">{question.question_text}</p>
                  <div className="grid grid-cols-1 gap-1 text-sm">
                    <div>A. {question.option_a}</div>
                    <div>B. {question.option_b}</div>
                    <div>C. {question.option_c}</div>
                    <div>D. {question.option_d}</div>
                    <div>E. {question.option_e}</div>
                  </div>
                </div>
              </Card>
            ))}
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
          PDFアップロード（実際のOCR対応）
        </CardTitle>
        <CardDescription>問題PDFと解答PDFをアップロードして自動解析します</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">アップロード</TabsTrigger>
            <TabsTrigger value="debug">デバッグ</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
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
              <Label htmlFor="questionFile">問題PDF *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="questionFile"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setQuestionFile(e.target.files?.[0] || null)}
                  disabled={isProcessing}
                />
                {questionFile && <CheckCircle className="h-4 w-4 text-green-600" />}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="answerFile">解答PDF（オプション）</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="answerFile"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setAnswerFile(e.target.files?.[0] || null)}
                  disabled={isProcessing}
                />
                {answerFile && <CheckCircle className="h-4 w-4 text-green-600" />}
              </div>
              <p className="text-xs text-muted-foreground">解答PDFがない場合は、後で手動で正解を設定できます</p>
            </div>

            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-800">
                実際のOCR機能が有効です。Tesseract.jsとPDF.jsを使用してPDFを解析します。
              </p>
            </div>

            <Button
              onClick={handleFileUpload}
              disabled={!selectedCategory || !questionFile || isProcessing}
              className="w-full"
            >
              {isProcessing ? "処理中..." : "アップロード開始"}
            </Button>
          </TabsContent>

          <TabsContent value="debug" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Bug className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-800">
                  PDFから抽出されるテキストを確認して、解析がうまくいかない場合の原因を調べることができます。
                </p>
              </div>

              <Button
                onClick={handleDebugPDF}
                disabled={!questionFile || isProcessing}
                variant="outline"
                className="w-full bg-transparent"
              >
                <Eye className="h-4 w-4 mr-2" />
                {isProcessing ? "解析中..." : "PDFテキストを確認"}
              </Button>

              {showDebug && debugText && (
                <div className="space-y-2">
                  <Label>抽出されたテキスト</Label>
                  <Textarea
                    value={debugText}
                    readOnly
                    rows={15}
                    className="font-mono text-xs"
                    placeholder="PDFから抽出されたテキストがここに表示されます"
                  />
                  <p className="text-xs text-muted-foreground">
                    このテキストから問題と選択肢が正しく認識されているか確認してください。
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
