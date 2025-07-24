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
import { Upload, CheckCircle, AlertCircle, FileText, X, Brain, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import type { Category } from "@/lib/types"
import { processQuizPDFs, convertToLegacyFormat, type ExtractedQuestion, type ParsedQuizData } from "@/lib/ocr"

interface PDFUploadImprovedProps {
  categories: Category[]
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

export function PDFUploadImproved({ categories, onSuccess, onClose }: PDFUploadImprovedProps) {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [questionFile, setQuestionFile] = useState<File | null>(null)
  const [answerFile, setAnswerFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<"upload" | "manual" | "complete">("upload")
  const [manualQuestions, setManualQuestions] = useState("")
  const [manualAnswers, setManualAnswers] = useState("")

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
      // Step 1: 問題ファイルをSupabaseストレージにアップロード
      setProgress(20)
      const sanitizedQuestionFileName = sanitizeFileName(questionFile.name)
      const questionFileName = `questions_${Date.now()}_${sanitizedQuestionFileName}`

      console.log("Uploading question file:", questionFileName)

      const { data: questionUploadData, error: questionUploadError } = await supabase.storage
        .from("pdfs")
        .upload(questionFileName, questionFile)

      if (questionUploadError) {
        console.error("Question upload error:", questionUploadError)
        throw new Error(`問題ファイルアップロードエラー: ${questionUploadError.message}`)
      }

      setProgress(40)

      // Step 2: 解答ファイルがある場合はアップロード
      let answerUploadData = null
      if (answerFile) {
        const sanitizedAnswerFileName = sanitizeFileName(answerFile.name)
        const answerFileName = `answers_${Date.now()}_${sanitizedAnswerFileName}`

        console.log("Uploading answer file:", answerFileName)

        const { data: answerUpload, error: answerUploadError } = await supabase.storage
          .from("pdfs")
          .upload(answerFileName, answerFile)

        if (answerUploadError) {
          console.error("Answer upload error:", answerUploadError)
          throw new Error(`解答ファイルアップロードエラー: ${answerUploadError.message}`)
        }

        answerUploadData = answerUpload
      }

      setProgress(60)

      // Step 3: アップロード記録を保存
      const { data: user } = await supabase.auth.getUser()

      const uploadsToInsert = [
        {
          category_id: selectedCategory,
          file_name: questionFile.name,
          file_url: questionUploadData.path,
          file_type: "questions" as const,
          file_size: questionFile.size,
          uploaded_by: user.user?.id,
          is_processed: false,
        },
      ]

      if (answerUploadData && answerFile) {
        uploadsToInsert.push({
          category_id: selectedCategory,
          file_name: answerFile.name,
          file_url: answerUploadData.path,
          file_type: "answers" as const,
          file_size: answerFile.size,
          uploaded_by: user.user?.id,
          is_processed: false,
        })
      }

      const { error: recordError } = await supabase.from("pdf_uploads").insert(uploadsToInsert)

      if (recordError) {
        console.error("Record error:", recordError)
        throw new Error(`記録保存エラー: ${recordError.message}`)
      }

      setProgress(100)

      toast({
        title: "ファイルアップロード完了",
        description: `${answerFile ? "問題ファイルと解答ファイル" : "問題ファイル"}が正常にアップロードされました。`,
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
      let questions = parseManualQuestions(manualQuestions)

      if (questions.length === 0) {
        throw new Error("有効な問題データが見つかりませんでした。フォーマットを確認してください。")
      }

      // 解答データがある場合はマッチング
      if (manualAnswers.trim()) {
        const answers = parseManualAnswers(manualAnswers)
        questions = matchQuestionsWithAnswers(questions, answers)
      }

      // 問題セットを作成
      const category = categories.find((c) => c.id === selectedCategory)
      const { data: questionSet, error: setError } = await supabase
        .from("question_sets")
        .insert({
          category_id: selectedCategory,
          title: `アップロード - ${new Date().toLocaleDateString("ja-JP")}`,
          description: `${category?.name}の問題セット（${answerFile ? "解答付き" : "手動入力"}）`,
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
