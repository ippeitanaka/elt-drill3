"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, CheckCircle, AlertCircle, FileText, X, Brain, Sparkles, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import type { Category } from "@/lib/types"
import { processQuizPDFs, convertToLegacyFormat, type ExtractedQuestion, type ParsedQuizData } from "@/lib/ocr"

interface PDFUploadImprovedProps {
  categories?: Category[] // オプショナルに変更
  onSuccess: () => void
  onClose: () => void
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

interface ParsedAnswers {
  [questionNumber: string]: "A" | "B" | "C" | "D" | "E"
}

interface SimpleCategory {
  id: string
  name: string
  value: string
}

export function PDFUploadImproved({ categories: passedCategories, onSuccess, onClose }: PDFUploadImprovedProps) {
  const [categories, setCategories] = useState<SimpleCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [questionFile, setQuestionFile] = useState<File | null>(null)
  const [answerFile, setAnswerFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<"upload" | "manual" | "complete">("upload")
  const [manualQuestions, setManualQuestions] = useState("")
  const [manualAnswers, setManualAnswers] = useState("")

  // カテゴリー再読み込み関数
  const reloadCategories = async () => {
    try {
      console.log('カテゴリー再読み込み開始...')
      const response = await fetch('/api/categories-for-pdf')
      const data = await response.json()
      
      console.log('カテゴリー再読み込み結果:', data)
      
      if (data.success) {
        setCategories(data.categories)
        toast({
          title: "カテゴリー更新",
          description: `${data.categories.length}個のカテゴリーを読み込みました`,
        })
      } else {
        toast({
          title: "カテゴリー取得エラー",
          description: data.message || "カテゴリーを取得できませんでした",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('カテゴリー再読み込みエラー:', error)
      toast({
        title: "カテゴリー取得エラー", 
        description: "カテゴリーの読み込みに失敗しました",
        variant: "destructive",
      })
    }
  }

  // コンポーネント内でカテゴリーを直接取得
  useEffect(() => {
    const loadCategories = async () => {
      try {
        console.log('カテゴリー取得開始...')
        const response = await fetch('/api/categories-for-pdf')
        const data = await response.json()
        
        console.log('カテゴリー取得結果:', data)
        
        if (data.success) {
          setCategories(data.categories)
          console.log('カテゴリー設定完了:', data.categories)
        } else {
          console.error('カテゴリー取得失敗:', data)
          toast({
            title: "カテゴリー取得エラー",
            description: data.message || "カテゴリーを取得できませんでした",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('カテゴリー取得エラー:', error)
        toast({
          title: "カテゴリー取得エラー", 
          description: "カテゴリーの読み込みに失敗しました",
          variant: "destructive",
        })
      }
    }

    loadCategories()
  }, [])

  // ファイル名をサニタイズする関数
  const sanitizeFileName = (fileName: string): string => {
    // 日本語文字、特殊文字を安全な文字に変換
    return fileName
      .replace(/[^\w\-_.]/g, "_") // 英数字、ハイフン、アンダースコア、ドット以外を_に変換
      .replace(/_{2,}/g, "_") // 連続するアンダースコアを1つに
      .replace(/^_+|_+$/g, "") // 先頭と末尾のアンダースコアを削除
      .substring(0, 100) // 長すぎるファイル名を制限
  }

  // 問題テキストを解析する関数（改良版）
  const parseManualQuestions = (text: string): ParsedQuestion[] => {
    const questions: ParsedQuestion[] = []
    const lines = text
      .trim()
      .split("\n")
      .filter((line) => line.trim())

    let i = 0
    while (i < lines.length) {
      // 問題番号を探す
      const questionMatch = lines[i].match(/^(\d+)(.*)/)
      if (!questionMatch) {
        i++
        continue
      }

      const questionNumber = questionMatch[1]
      let questionText = questionMatch[2].trim()

      // 問題文が複数行にわたる場合を考慮
      i++
      while (i < lines.length && !lines[i].match(/^\s*[1-5][.\s]/)) {
        questionText += " " + lines[i].trim()
        i++
      }

      // 選択肢を探す
      const options: string[] = []
      for (let optionNum = 1; optionNum <= 5; optionNum++) {
        if (i < lines.length) {
          const optionMatch = lines[i].match(/^\s*(\d+)[.\s](.*)/)
          if (optionMatch && optionMatch[1] === optionNum.toString()) {
            options.push(optionMatch[2].trim())
            i++
          } else {
            // 選択肢が見つからない場合はスキップ
            break
          }
        }
      }

      // 5つの選択肢が揃った場合のみ問題として追加
      if (options.length === 5 && questionText) {
        const question: ParsedQuestion = {
          question_text: questionText,
          option_a: options[0],
          option_b: options[1],
          option_c: options[2],
          option_d: options[3],
          option_e: options[4],
        }
        questions.push(question)
      }
    }

    return questions
  }

  // 解答を解析する関数
  const parseManualAnswers = (text: string): ParsedAnswers => {
    const answers: ParsedAnswers = {}
    const lines = text.trim().split("\n")

    for (const line of lines) {
      // 様々なフォーマットに対応
      const patterns = [
        /問\s*(\d+)\s*[：:]\s*([12345ABCDE])/,
        /(\d+)\s*[.．]\s*([12345ABCDE])/,
        /(\d+)\s*[-－]\s*([12345ABCDE])/,
        /(\d+)\s+([12345ABCDE])/,
      ]

      for (const pattern of patterns) {
        const match = line.match(pattern)
        if (match) {
          const questionNum = match[1]
          let answer = match[2].toUpperCase()

          // 数字を文字に変換
          if (answer === "1") answer = "A"
          else if (answer === "2") answer = "B"
          else if (answer === "3") answer = "C"
          else if (answer === "4") answer = "D"
          else if (answer === "5") answer = "E"

          if (["A", "B", "C", "D", "E"].includes(answer)) {
            answers[questionNum] = answer as "A" | "B" | "C" | "D" | "E"
          }
          break
        }
      }
    }

    return answers
  }

  // 問題と解答をマッチングする関数
  const matchQuestionsWithAnswers = (questions: ParsedQuestion[], answers: ParsedAnswers): ParsedQuestion[] => {
    return questions.map((question, index) => ({
      ...question,
      correct_answer: answers[(index + 1).toString()] || "A", // デフォルトはA
    }))
  }

  const handleFileUpload = async () => {
    if (categories.length === 0) {
      toast({
        title: "カテゴリーがありません",
        description: "カテゴリーを作成してから再度お試しください。",
        variant: "destructive",
      })
      return
    }

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
      setProgress(20)

      // ユーザー情報を取得
      const { data: user } = await supabase.auth.getUser()
      console.log('User authentication data:', {
        user: user.user,
        userId: user.user?.id,
        isAuthenticated: !!user.user
      })
      
      // FormDataを作成してAPIに送信
      const formData = new FormData()
      formData.append('questionFile', questionFile)
      if (answerFile) {
        formData.append('answerFile', answerFile)
      }
      formData.append('categoryId', selectedCategory)
      formData.append('userId', user.user?.id || 'anonymous')

      setProgress(40)

      console.log("Sending files to API:", {
        questionFile: questionFile.name,
        answerFile: answerFile?.name,
        categoryId: selectedCategory
      })

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      console.log("Upload API result:", result)

      setProgress(100)

      toast({
        title: "ファイルアップロード完了",
        description: `${answerFile ? "問題ファイルと解答ファイル" : "問題ファイル"}が正常にアップロードされました。大容量PDF処理を開始します...`,
      })

      // 大容量PDF処理APIを呼び出し
      await handleLargePDFProcessing(result.data)

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

  // 大容量PDF処理を行う関数
  const handleLargePDFProcessing = async (uploadData: any) => {
    try {
      setProgress(20)
      toast({
        title: "大容量PDF処理開始",
        description: "PDFファイルから全ての問題を抽出しています...",
      })

      console.log('Upload data received:', uploadData)

      const response = await fetch('/api/process-large-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionFileUrl: uploadData.questionFileUrl || uploadData.file_url,
          answerFileUrl: uploadData.answerFileUrl || uploadData.answer_file_url,
          categoryId: selectedCategory,
          targetQuestionCount: 469
        }),
      })

      setProgress(90)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('大容量PDF処理エラー:', errorData)
        throw new Error(errorData.error || '大容量PDF処理に失敗しました')
      }

      const result = await response.json()
      setProgress(100)
      
      console.log(`大容量PDF処理完了: ${result.data?.totalExtracted || 'N/A'}問抽出、${result.data?.totalSaved || 'N/A'}問保存`)

      toast({
        title: "処理完了",
        description: result.message,
      })

      onSuccess()
      
    } catch (error: any) {
      console.error("大容量PDF処理エラー:", error)
      toast({
        title: "大容量PDF処理エラー",
        description: error.message,
        variant: "destructive",
      })
      
      // エラーの場合はマニュアル入力画面に移行
      setStep("manual")
    }
  }

  const handleManualSave = async () => {
    if (categories.length === 0) {
      toast({
        title: "カテゴリーがありません",
        description: "カテゴリーを作成してから再度お試しください。",
        variant: "destructive",
      })
      return
    }

    if (!selectedCategory || !manualQuestions.trim()) {
      toast({
        title: "データが不足しています",
        description: "カテゴリーと問題データを入力してください。",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      let questions = parseManualQuestions(manualQuestions)

      console.log("Parsed questions:", questions)

      if (questions.length === 0) {
        throw new Error("有効な問題データが見つかりませんでした。フォーマットを確認してください。")
      }

      // 解答データがある場合はマッチング
      if (manualAnswers.trim()) {
        const answers = parseManualAnswers(manualAnswers)
        questions = matchQuestionsWithAnswers(questions, answers)
      }

      // APIを使用して問題を保存
      const category = categories.find((c) => c.id === selectedCategory)
      const requestBody = {
        categoryId: selectedCategory,
        questions: questions,
        title: `アップロード - ${new Date().toLocaleDateString("ja-JP")}`,
        description: `${category?.name}の問題セット（${answerFile ? "解答付き" : "手動入力"}）`
      }

      console.log("Sending questions to API:", requestBody)

      const response = await fetch('/api/save-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Save failed')
      }

      const result = await response.json()
      console.log("Save API result:", result)

      toast({
        title: "問題を保存しました",
        description: result.message,
      })

      setStep("complete")
      onSuccess()
    } catch (error: any) {
      console.error("Save process error:", error)
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
    setManualQuestions("")
    setManualAnswers("")
    setStep("upload")
    setProgress(0)
  }

  // 提供されたデータを自動入力する関数
  const loadSampleData = () => {
    const sampleQuestions = `1心肺停止
11歳以上8歳未満の小児に対する心臓マッサージで誤っているのはどれか。
1.1分間に100回の速さで行う。
2.心臓マッサージ15回に人工呼吸2回の割合で行う。
3.圧迫部位は胸骨下半分の位置である。
4.圧迫の深さは胸の厚さの約1/3である。
5.圧迫は片手で行う。

2心肺蘇生法中断の指標にならないのはどれか。
1.頸動脈触知
2.ゆっくりとしたスムーズな呼吸
3.身体の合目的な動き
4.咳　嗽
5.対光反射

3救急救命士の気道確保の方法で心肺機能停止状態（心停止又は呼吸停止）の傷病者に対して適応でない器具はどれか。
1.経口エアウエイ
2.経鼻エアウエイ
3.ラリンゲアルマスク
4.食道閉鎖式エアウエイ
5.気管チューブ`

    const sampleAnswers = `1 2
2 5
3 5`

    setManualQuestions(sampleQuestions)
    setManualAnswers(sampleAnswers)
  }

  if (step === "complete") {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">問題登録完了</h3>
          <p className="text-muted-foreground mb-6">問題が正常に保存されました。</p>
          <div className="flex gap-2">
            <Button onClick={resetForm}>新しい問題を追加</Button>
            <Button variant="outline" onClick={onClose}>
              閉じる
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === "manual") {
    return (
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>問題データ入力</CardTitle>
              <CardDescription>5択問題のデータを手動で入力してください</CardDescription>
            </div>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="questions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="questions">問題入力</TabsTrigger>
              <TabsTrigger value="answers">解答入力（オプション）</TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">問題入力フォーマット:</h4>
                <pre className="text-xs text-blue-700 whitespace-pre-wrap">
                  {`1問題文
1.選択肢A
2.選択肢B  
3.選択肢C
4.選択肢D
5.選択肢E

2次の問題文
1.選択肢A
2.選択肢B
...`}
                </pre>
                <Button size="sm" onClick={loadSampleData} className="mt-2">
                  サンプルデータを読み込み
                </Button>
              </div>

              <div className="space-y-2">
                <Label>問題データ</Label>
                <Textarea
                  value={manualQuestions}
                  onChange={(e) => setManualQuestions(e.target.value)}
                  placeholder="上記のフォーマットに従って問題データを入力してください..."
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="answers" className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">解答入力フォーマット:</h4>
                <pre className="text-xs text-green-700 whitespace-pre-wrap">
                  {`1 2
2 5
3 1

または

1 B
2 E
3 A`}
                </pre>
              </div>

              <div className="space-y-2">
                <Label>解答データ（オプション）</Label>
                <Textarea
                  value={manualAnswers}
                  onChange={(e) => setManualAnswers(e.target.value)}
                  placeholder="解答データを入力してください..."
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  解答がない場合は、すべてAとして保存されます（後で編集可能）
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4">
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              問題・解答アップロード
            </CardTitle>
            <CardDescription>問題ファイルと解答ファイルをアップロードします</CardDescription>
          </div>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
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
          <div className="flex items-center justify-between">
            <Label>カテゴリー *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reloadCategories}
              disabled={isProcessing}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              更新
            </Button>
          </div>
          {categories.length === 0 && (
            <div className="text-sm text-gray-500 mb-2">
              カテゴリーを読み込み中... ({categories.length}個)
            </div>
          )}
          <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isProcessing || categories.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={categories.length > 0 ? "カテゴリーを選択" : "カテゴリーがありません"} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categories.length > 0 && (
            <div className="text-xs text-gray-500">
              {categories.length}個のカテゴリーが利用可能
            </div>
          )}
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

        <div className="space-y-2">
          <Label htmlFor="answerFile">解答ファイル（オプション）</Label>
          <div className="flex items-center gap-2">
            <Input
              id="answerFile"
              type="file"
              accept=".pdf,.txt,.docx"
              onChange={(e) => setAnswerFile(e.target.files?.[0] || null)}
              disabled={isProcessing}
            />
            {answerFile && <CheckCircle className="h-4 w-4 text-green-600" />}
          </div>
          <p className="text-xs text-muted-foreground">解答ファイルがない場合は、後で手動で正解を設定できます</p>
        </div>

        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            ファイルアップロード後、手動で問題データを入力してください。日本語ファイル名は自動的に変換されます。
          </p>
        </div>

        <Button
          onClick={handleFileUpload}
          disabled={categories.length === 0 || !selectedCategory || !questionFile || isProcessing}
          className="w-full"
        >
          {isProcessing ? "アップロード中..." : categories.length === 0 ? "カテゴリーがありません" : "ファイルをアップロード"}
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
