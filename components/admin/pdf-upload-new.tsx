"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, CheckCircle, AlertCircle, FileText, X, Brain, Sparkles, Zap } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { Category } from "@/lib/types"

interface PDFUploadNewProps {
  categories: Category[]
  onSuccess: () => void
  onClose: () => void
}

export function PDFUploadNew({ categories, onSuccess, onClose }: PDFUploadNewProps) {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [questionFile, setQuestionFile] = useState<File | null>(null)
  const [answerFile, setAnswerFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<"upload" | "processing" | "complete">("upload")
  const [uploadResults, setUploadResults] = useState<any>(null)

  // デバッグ用ログ
  console.log('🔍 PDFUploadNew: コンポーネント描画', {
    categoriesCount: categories.length,
    categories: categories,
    selectedCategory,
    firstCategory: categories[0] || null
  })

  // カテゴリーが空の場合の警告
  if (categories.length === 0) {
    console.warn('⚠️ PDFUploadNew: カテゴリーが空です')
  }

  const handleUpload = async () => {
    if (!selectedCategory) {
      toast({
        title: "⚠️ カテゴリーが選択されていません",
        description: "問題を分類するカテゴリーを選択してください。",
        variant: "destructive",
      })
      return
    }
    
    if (!questionFile) {
      toast({
        title: "⚠️ ファイルが選択されていません",
        description: "問題PDFファイルを選択してください。",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setStep("processing")

    try {
      // ファイルアップロード（Supabase Storage）
      setProgress(10)
      toast({
        title: "📤 ファイルアップロード中...",
        description: "PDFファイルをアップロードしています"
      })
      
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // 問題PDFアップロード
      const questionFileName = `questions_${Date.now()}.pdf`
      const { data: questionUpload, error: questionUploadError } = await supabase.storage
        .from('pdfs')
        .upload(questionFileName, questionFile)

      if (questionUploadError) throw questionUploadError

      setProgress(25)
      
      // 解答PDFアップロード（任意）
      let answerFileUrl: string | null = null
      if (answerFile) {
        const answerFileName = `answers_${Date.now()}.pdf`
        const { data: answerUpload, error: answerUploadError } = await supabase.storage
          .from('pdfs')
          .upload(answerFileName, answerFile)

        if (!answerUploadError && answerUpload) {
          const { data: { publicUrl: answerUrl } } = supabase.storage
            .from('pdfs')
            .getPublicUrl(answerUpload.path)
          answerFileUrl = answerUrl
        }
      }

      // 問題PDFのpublic URLを取得
      const { data: { publicUrl: questionFileUrl } } = supabase.storage
        .from('pdfs')
        .getPublicUrl(questionUpload.path)

      setProgress(50)
      toast({
        title: "🔍 高精度OCR処理開始",
        description: "PDFから問題を抽出しています..."
      })

      // 新しい高精度OCR APIを呼び出し
      const response = await fetch('/api/process-large-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionFileUrl,
          answerFileUrl,
          categoryId: parseInt(selectedCategory)
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || result.message || 'OCR処理に失敗しました')
      }

      setProgress(100)
      setUploadResults(result.data)
      setStep("complete")

      // 成功メッセージ（詳細付き）
      toast({
        title: "🎉 PDF処理完了！",
        description: `${result.data.totalSaved}問をデータベースに保存しました`,
        duration: 5000
      })

      // 詳細メッセージ表示
      setTimeout(() => {
        toast({
          title: "📊 処理結果の詳細",
          description: `抽出: ${result.data.totalExtracted}問 | 保存: ${result.data.totalSaved}問${result.data.totalErrors > 0 ? ` | エラー: ${result.data.totalErrors}問` : ''}`,
          duration: 8000
        })
      }, 1000)

      setTimeout(() => {
        onSuccess()
      }, 3000)

    } catch (error: any) {
      console.error("❌ PDF処理エラー:", error)
      
      toast({
        title: "❌ PDF処理エラー",
        description: error.message || "PDFの処理中にエラーが発生しました。ファイルを確認してください。",
        variant: "destructive",
        duration: 8000
      })
      
      setStep("upload")
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
    setUploadResults(null)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              高精度PDF問題抽出
            </CardTitle>
            <CardDescription>
              PDFファイルから問題を自動抽出してデータベースに保存します
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {step === "upload" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">問題カテゴリー</Label>
                <Select 
                  value={selectedCategory} 
                  onValueChange={(value) => {
                    setSelectedCategory(value)
                    console.log('📝 カテゴリー選択:', value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリーを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <SelectItem value="no-categories" disabled>
                        カテゴリーがありません
                      </SelectItem>
                    ) : (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {categories.length === 0 && (
                  <p className="text-sm text-red-600">
                    ⚠️ カテゴリーが読み込まれていません
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="question-file">問題PDF *</Label>
                <Input
                  id="question-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setQuestionFile(e.target.files?.[0] || null)}
                />
                {questionFile && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {questionFile.name} ({(questionFile.size / 1024 / 1024).toFixed(2)}MB)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer-file">解答PDF（任意）</Label>
                <Input
                  id="answer-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setAnswerFile(e.target.files?.[0] || null)}
                />
                {answerFile && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {answerFile.name} ({(answerFile.size / 1024 / 1024).toFixed(2)}MB)
                  </p>
                )}
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedCategory || !questionFile || isProcessing}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                PDF処理を開始
              </Button>
            </div>
          )}

          {step === "processing" && (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-500 animate-spin" />
                <span className="text-lg font-semibold">高精度OCR処理中...</span>
              </div>
              
              <Progress value={progress} className="w-full" />
              
              <div className="space-y-2 text-sm text-gray-600">
                <p>PDFファイルから問題を抽出しています</p>
                <p>しばらくお待ちください（ファイルサイズに応じて時間がかかります）</p>
              </div>
            </div>
          )}

          {step === "complete" && uploadResults && (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="h-8 w-8" />
                <span className="text-xl font-bold">処理完了！</span>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-green-800">処理結果</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">抽出問題数:</span>
                    <span className="ml-2 text-green-700">{uploadResults.totalExtracted}問</span>
                  </div>
                  <div>
                    <span className="font-medium">保存問題数:</span>
                    <span className="ml-2 text-green-700">{uploadResults.totalSaved}問</span>
                  </div>
                  {uploadResults.totalErrors > 0 && (
                    <div>
                      <span className="font-medium">エラー:</span>
                      <span className="ml-2 text-red-600">{uploadResults.totalErrors}問</span>
                    </div>
                  )}
                </div>
              </div>

              {uploadResults.extractedQuestions && uploadResults.extractedQuestions.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold text-blue-800">抽出された問題例</h3>
                  <div className="text-left text-sm space-y-2">
                    {uploadResults.extractedQuestions.slice(0, 2).map((q: any, i: number) => (
                      <div key={i} className="border-l-2 border-blue-300 pl-3">
                        <p className="font-medium">{q.question_text}</p>
                        <p className="text-gray-600">選択肢: {Object.keys(q.options).length}個</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={resetForm} variant="outline" className="flex-1">
                  <Zap className="h-4 w-4 mr-2" />
                  続けて処理
                </Button>
                <Button onClick={onClose} className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  完了
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
