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
  category_id: string
  question_text: string
  choices: string[]
  correct_answer: number
  explanation?: string
  difficulty_level: number
  points: number
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

  const loadQuestions = async () => {
    try {
      setLoading(true)
      
      // 選択されたカテゴリーの問題を取得
      const { data: questionsData, error } = await supabase
        .from('questions')
        .select('*')
        .in('category_id', selectedCategories)
        .order('id')
        .limit(20) // 最大20問

      if (error) {
        console.error('問題取得エラー:', error)
        toast({
          title: "エラー",
          description: "問題の取得に失敗しました。",
          variant: "destructive",
        })
        return
      }

      if (!questionsData || questionsData.length === 0) {
        toast({
          title: "問題が見つかりません",
          description: "選択されたカテゴリーに問題がありません。",
          variant: "destructive",
        })
        // モックデータを代わりに使用
        const mockQuestions: Question[] = [
          {
            id: "mock-1",
            category_id: selectedCategories[0] || "1",
            question_text: "次の文で正しい文法はどれですか？",
            choices: [
              "I have been study English for 3 years.",
              "I have been studying English for 3 years.",
              "I am been studying English for 3 years.",
              "I have studying English for 3 years."
            ],
            correct_answer: 1,
            explanation: "現在完了進行形の正しい形は 'have been studying' です。",
            difficulty_level: 2,
            points: 20
          },
          {
            id: "mock-2", 
            category_id: selectedCategories[0] || "1",
            question_text: "'Ambitious' の意味として最も適切なものはどれですか？",
            choices: [
              "野心的な",
              "曖昧な", 
              "好奇心旺盛な",
              "注意深い"
            ],
            correct_answer: 0,
            explanation: "Ambitious は「野心的な、向上心のある」という意味です。",
            difficulty_level: 1,
            points: 10
          }
        ]
        setQuestions(mockQuestions)
        setLoading(false)
        return
      }

      // データをシャッフル
      const shuffledQuestions = questionsData.sort(() => 0.5 - Math.random())
      setQuestions(shuffledQuestions)
      setLoading(false)
    } catch (error) {
      console.error('問題読み込みエラー:', error)
      toast({
        title: "エラー",
        description: "問題の読み込み中にエラーが発生しました。",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswered) return
    
    setSelectedAnswer(answerIndex)
    setIsAnswered(true)
    
    if (answerIndex === questions[currentQuestionIndex].correct_answer) {
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

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setIsAnswered(false)
    setScore(0)
    setTimeRemaining(30)
    setIsCompleted(false)
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
    const percentage = Math.round((score / questions.length) * 100)
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl font-bold">クイズ完了！</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {percentage}%
                </div>
                <div className="space-y-2">
                  <p className="text-xl text-gray-700">
                    {questions.length}問中 <span className="font-bold text-indigo-600">{score}問正解</span>
                  </p>
                  <div className="flex justify-center">
                    <Badge 
                      variant={percentage >= 80 ? "default" : percentage >= 60 ? "secondary" : "destructive"}
                      className="text-lg px-4 py-2"
                    >
                      {percentage >= 80 ? "素晴らしい！" : percentage >= 60 ? "良い結果！" : "もう少し頑張ろう！"}
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
                  if (index === currentQuestion.correct_answer) {
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
                      {isAnswered && index === currentQuestion.correct_answer && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {isAnswered && index === selectedAnswer && index !== currentQuestion.correct_answer && (
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
