"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, CheckCircle, XCircle, RotateCcw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

interface Question {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_e: string
  correct_answer: string
  correct_answer_index: number
  explanation?: string
  difficulty_level: number
  points: number
  choices: string[]
}

interface QuizRunnerProps {
  selectedCategories: string[]
  selectedSets: string[]
  onComplete: () => void
  onBack: () => void
}

export function QuizRunner({ selectedCategories, selectedSets, onComplete, onBack }: QuizRunnerProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [isCompleted, setIsCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  // 追加: 途中リタイア状態
  const [isRetired, setIsRetired] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [selectedCategories, selectedSets])

  useEffect(() => {
    if (timeRemaining > 0 && !isAnswered && !isCompleted && questions.length > 0) {
      const timer = setTimeout(() => setTimeRemaining(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0 && !isAnswered) {
      handleTimeUp()
    }
  }, [timeRemaining, isAnswered, isCompleted, questions.length])

  const normalizeLetter = (val: any): 'a'|'b'|'c'|'d'|'e' => {
    if (val === null || val === undefined) return 'a'
    const s = String(val).trim().toLowerCase()
    if (['a','b','c','d','e'].includes(s)) return s as any
    if (/^[0-4]$/.test(s)) return (['a','b','c','d','e'][parseInt(s,10)] as any)
    if (/^[1-5]$/.test(s)) return (['a','b','c','d','e'][parseInt(s,10)-1] as any)
    return 'a'
  }

  const loadQuestions = async () => {
    try {
      setLoading(true)
      
      console.log('QuizRunner: 問題取得開始', {
        selectedCategories,
        selectedSets
      })
      
      // APIエンドポイントから問題を取得（制限なし）
      const response = await fetch('/api/quiz-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedCategories,
          selectedSets,
          questionCount: 1000 // すべての問題を取得（制限なし）
        }),
      })

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Questions fetch failed')
      }

      const questionsData = result.data

      console.log('QuizRunner: 問題取得完了', {
        questionsCount: questionsData.length
      })

      if (!questionsData || questionsData.length === 0) {
        toast({
          title: "問題が見つかりません",
          description: "選択されたカテゴリーに問題がありません。",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // 不可視文字や全角スペースを除去してからトリム
      const stripInvisible = (s: any) =>
        (s ?? '')
          .toString()
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // ゼロ幅類
          .replace(/\u3000/g, ' ') // 全角スペース
          .replace(/\s+/g, ' ')
          .trim()

      // データを整形（トリムして空白のみを除外。正解インデックスも再計算）
      const processedQuestions = questionsData.map((q: any) => {
        const trim = (v: any) => stripInvisible(v)

        // a-e のキー付き配列に正規化してから空を除外
        let keyed: Array<{ key: 'a'|'b'|'c'|'d'|'e'; text: string }> = []
        let correctLetter: 'a'|'b'|'c'|'d'|'e' = 'a'

        if (q.options && q.correct_answers) {
          try {
            const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            const correctAnswers = typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers) : q.correct_answers
            correctLetter = normalizeLetter(Array.isArray(correctAnswers) ? correctAnswers[0] : correctAnswers)
            keyed = [
              { key: 'a', text: trim(options?.a) },
              { key: 'b', text: trim(options?.b) },
              { key: 'c', text: trim(options?.c) },
              { key: 'd', text: trim(options?.d) },
              { key: 'e', text: trim(options?.e) },
            ]
          } catch (error) {
            console.warn('JSON解析エラー:', error)
          }
        }
        
        if (keyed.length === 0) {
          // 古い形式
          keyed = [
            { key: 'a', text: trim(q.option_a) },
            { key: 'b', text: trim(q.option_b) },
            { key: 'c', text: trim(q.option_c) },
            { key: 'd', text: trim(q.option_d) },
            { key: 'e', text: trim(q.option_e) },
          ]
          correctLetter = normalizeLetter(q.correct_answer)
        }

        // 見た目が空になる文字を除去した後で判定
        const filtered = keyed.filter(k => stripInvisible(k.text).length > 0)
        const choices = filtered.map(k => k.text)
        const correctIndex = Math.max(0, filtered.findIndex(k => k.key === correctLetter))

        // フォールバック（全て空）
        const finalChoices = choices.length > 0 ? choices : ['（選択肢がありません）']
        const finalCorrectIndex = choices.length > 0 ? (correctIndex >= 0 ? correctIndex : 0) : 0

        // 難易度/ポイントのデフォルト
        const difficulty_level = (() => {
          const d = (q.difficulty || '').toString().toLowerCase()
          if (d === 'easy') return 1
          if (d === 'hard') return 5
          return 3
        })()
        const points = Number.isFinite(q.points) ? q.points : 1

        return {
          ...q,
          difficulty_level,
          points,
          choices: finalChoices,
          correct_answer_index: finalCorrectIndex,
        }
      })
      
      // 重複を除去（IDベース）
      const uniqueQuestions = processedQuestions.filter((question: any, index: number, self: any[]) => 
        index === self.findIndex((q: any) => q.id === question.id)
      )
      
      // Fisher-Yates アルゴリズムでシャッフル
      const shuffledQuestions = [...uniqueQuestions]
      for (let i = shuffledQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]]
      }
      
      console.log('QuizRunner: 問題処理完了', {
        originalCount: questionsData.length,
        uniqueCount: uniqueQuestions.length,
        finalCount: shuffledQuestions.length,
        sampleChoices: shuffledQuestions[0]?.choices
      })
      
      setQuestions(shuffledQuestions)
      // 開始時はリタイア状態をリセット
      setIsRetired(false)
      setLoading(false)
    } catch (error: any) {
      console.error('問題読み込みエラー:', error)
      toast({
        title: "エラー",
        description: error.message || "問題の読み込み中にエラーが発生しました。",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered) return
    
    setSelectedAnswer(answerIndex)
    setIsAnswered(true)
    
    if (answerIndex === questions[currentQuestionIndex].correct_answer_index) {
      setScore(prev => prev + 1)
    }
  }

  const handleTimeUp = () => {
    setIsAnswered(true)
    setSelectedAnswer(-1) // タイムアップの場合は-1
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setIsAnswered(false)
      setTimeRemaining(30)
    } else {
      setIsCompleted(true)
    }
  }

  // 追加: 途中リタイア処理（その時点で結果画面へ）
  const handleRetire = () => {
    setIsRetired(true)
    setIsCompleted(true)
  }

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setScore(0)
    setTimeRemaining(30)
    setIsCompleted(false)
    setIsRetired(false)
    loadQuestions()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">問題を読み込み中...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              問題が見つかりません
            </h3>
            <p className="text-gray-600 mb-4">
              選択されたカテゴリーに問題がありません。
            </p>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isCompleted) {
    // リタイア時は回答済み数を分母にする
    const answeredCount = currentQuestionIndex + (isAnswered ? 1 : 0)
    const denominator = isRetired ? Math.max(1, answeredCount) : questions.length
    const percentage = denominator === 0 ? 0 : Math.round((score / denominator) * 100)
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl font-bold">{isRetired ? '途中リタイア' : 'クイズ完了！'}</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {percentage}%
                </div>
                <div className="space-y-2">
                  <p className="text-xl text-gray-700">
                    {isRetired ? (
                      <>
                        回答済み <span className="font-bold text-indigo-600">{answeredCount}</span> 問中 <span className="font-bold text-indigo-600">{score}</span> 問正解
                      </>
                    ) : (
                      <>
                        {questions.length}問中 <span className="font-bold text-indigo-600">{score}問正解</span>
                      </>
                    )}
                  </p>
                  <div className="flex justify-center">
                    <Badge 
                      variant={percentage >= 80 ? "default" : percentage >= 60 ? "secondary" : "destructive"}
                      className="text-lg px-4 py-2"
                    >
                      {isRetired ? 'お疲れさまでした' : (percentage >= 80 ? "素晴らしい！" : percentage >= 60 ? "良い結果！" : "もう少し頑張ろう！")}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <Button 
                    onClick={handleRestartQuiz}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>もう一度挑戦</span>
                  </Button>
                  <Button 
                    onClick={onBack}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>カテゴリー選択に戻る</span>
                  </Button>
                  <Button 
                    onClick={onComplete}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600"
                  >
                    結果をランキングに記録
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  // 現在の問題が存在しない場合の安全チェック
  if (!currentQuestion || !currentQuestion.choices || currentQuestion.choices.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              問題データエラー
            </h3>
            <p className="text-gray-600 mb-4">
              問題データが正しく読み込まれませんでした。
            </p>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
      <div className="max-w-3xl mx-auto pt-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={onBack}
            variant="ghost"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>戻る</span>
          </Button>
          
          <div className="flex items-center space-x-4">
            {/* 途中リタイアボタン */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (window.confirm('この時点で終了して結果を表示しますか？')) {
                  handleRetire()
                }
              }}
            >
              リタイア
            </Button>

            <Badge variant="outline" className="flex items-center space-x-1">
              <span>{currentQuestionIndex + 1} / {questions.length}</span>
            </Badge>
            <Badge 
              variant={timeRemaining <= 10 ? "destructive" : "secondary"}
              className="flex items-center space-x-1"
            >
              <Clock className="h-3 w-3" />
              <span>{timeRemaining}秒</span>
            </Badge>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-600 mt-2 text-center">
            進捗: {Math.round(progress)}% 完了
          </p>
        </div>

        {/* 問題カード */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                難易度: {currentQuestion.difficulty_level}/5
              </Badge>
              <Badge variant="outline">
                {currentQuestion.points}pt
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 leading-relaxed">
              {currentQuestion.question_text}
            </h2>
            
            <div className="space-y-3">
              {currentQuestion.choices.map((choice, index) => {
                let buttonVariant: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link" = "outline"
                let buttonClassName = "w-full justify-start text-left h-auto p-4 border-2 transition-all"
                
                if (isAnswered) {
                  if (index === currentQuestion.correct_answer_index) {
                    buttonVariant = "default"
                    buttonClassName += " bg-green-100 border-green-500 text-green-800"
                  } else if (index === selectedAnswer) {
                    buttonVariant = "destructive"
                    buttonClassName += " bg-red-100 border-red-500 text-red-800"
                  } else {
                    buttonClassName += " opacity-50"
                  }
                } else {
                  buttonClassName += " hover:border-indigo-400 hover:bg-indigo-50"
                }

                return (
                  <Button
                    key={index}
                    variant={buttonVariant}
                    className={buttonClassName}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={isAnswered}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{choice}</span>
                      {isAnswered && index === currentQuestion.correct_answer_index && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {isAnswered && index === selectedAnswer && index !== currentQuestion.correct_answer_index && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </Button>
                )
              })}
            </div>

            {isAnswered && currentQuestion.explanation && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">解説</h4>
                <p className="text-blue-800">{currentQuestion.explanation}</p>
              </div>
            )}

            {isAnswered && (
              <div className="mt-6 flex justify-center">
                <Button 
                  onClick={handleNextQuestion}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600"
                  size="lg"
                >
                  {currentQuestionIndex < questions.length - 1 ? "次の問題へ" : "結果を見る"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* スコア表示 */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            現在のスコア: <span className="font-bold text-indigo-600">{score} / {currentQuestionIndex + (isAnswered ? 1 : 0)}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
