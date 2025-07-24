"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, CheckCircle, XCircle, RotateCcw } from "lucide-react"

interface Question {
  id: string
  text: string
  choices: string[]
  correct_answer: number
  difficulty: "easy" | "medium" | "hard"
  category_id: string
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

  useEffect(() => {
    loadQuestions()
  }, [selectedCategories, selectedSets])

  useEffect(() => {
    if (timeRemaining > 0 && !isAnswered && !isCompleted) {
      const timer = setTimeout(() => setTimeRemaining(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0 && !isAnswered) {
      handleTimeUp()
    }
  }, [timeRemaining, isAnswered, isCompleted])

  const loadQuestions = () => {
    // モックデータ（実際はSupabaseから取得）
    const mockQuestions: Question[] = [
      {
        id: "1",
        text: "次の文で正しい文法はどれですか？",
        choices: [
          "I have been study English for 3 years.",
          "I have been studying English for 3 years.",
          "I am been studying English for 3 years.",
          "I have studying English for 3 years."
        ],
        correct_answer: 1,
        difficulty: "medium",
        category_id: "1"
      },
      {
        id: "2",
        text: "'Ambitious' の意味として最も適切なものはどれですか？",
        choices: [
          "野心的な",
          "曖昧な", 
          "好奇心旺盛な",
          "注意深い"
        ],
        correct_answer: 0,
        difficulty: "easy",
        category_id: "2"
      },
      {
        id: "3",
        text: "次の文の空欄に入る最も適切な前置詞はどれですか？\n\"I'm interested ___ learning new languages.\"",
        choices: [
          "for",
          "in",
          "on",
          "at"
        ],
        correct_answer: 1,
        difficulty: "easy",
        category_id: "1"
      },
      {
        id: "4",
        text: "次の文を過去完了形に変換してください。\n\"She finished her homework before dinner.\"",
        choices: [
          "She had finished her homework before dinner.",
          "She has finished her homework before dinner.",
          "She was finishing her homework before dinner.",
          "She will have finished her homework before dinner."
        ],
        correct_answer: 0,
        difficulty: "hard",
        category_id: "1"
      },
      {
        id: "5",
        text: "'Eloquent' の意味として最も適切なものはどれですか？",
        choices: [
          "雄弁な",
          "無関心な",
          "強情な",
          "単純な"
        ],
        correct_answer: 0,
        difficulty: "medium",
        category_id: "2"
      }
    ]
    
    setQuestions(mockQuestions)
    setTimeRemaining(30)
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

  if (questions.length === 0) {
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
                    className="flex items-center"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    もう一度挑戦
                  </Button>
                  <Button 
                    onClick={onBack}
                    variant="outline"
                    className="flex items-center"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    カテゴリー選択に戻る
                  </Button>
                  <Button 
                    onClick={onComplete}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600"
                  >
                    結果を確認
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
      <div className="max-w-4xl mx-auto pt-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={onBack} 
            variant="ghost" 
            className="flex items-center text-gray-600 hover:text-indigo-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-lg px-3 py-1">
              {currentQuestionIndex + 1} / {questions.length}
            </Badge>
            <div className="flex items-center text-lg font-medium">
              <Clock className="w-5 h-5 mr-2 text-orange-500" />
              <span className={timeRemaining <= 10 ? "text-red-500" : "text-gray-700"}>
                {timeRemaining}秒
              </span>
            </div>
          </div>
        </div>

        {/* 進捗バー */}
        <div className="mb-8">
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-gray-600 mt-2 text-center">
            進捗: {Math.round(progress)}%
          </p>
        </div>

        {/* 問題カード */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">問題 {currentQuestionIndex + 1}</CardTitle>
              <Badge 
                variant="secondary" 
                className={`${
                  currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}
              >
                {currentQuestion.difficulty === 'easy' ? '基礎' :
                 currentQuestion.difficulty === 'medium' ? '標準' : '応用'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="mb-8">
              <p className="text-lg leading-relaxed whitespace-pre-line">
                {currentQuestion.text}
              </p>
            </div>
            
            <div className="space-y-3">
              {currentQuestion.choices.map((choice, index) => {
                let buttonClass = "w-full p-4 text-left border-2 rounded-lg transition-all duration-200 ";
                
                if (isAnswered) {
                  if (index === currentQuestion.correct_answer) {
                    buttonClass += "bg-green-50 border-green-500 text-green-700";
                  } else if (index === selectedAnswer && selectedAnswer !== currentQuestion.correct_answer) {
                    buttonClass += "bg-red-50 border-red-500 text-red-700";
                  } else {
                    buttonClass += "bg-gray-50 border-gray-300 text-gray-600";
                  }
                } else {
                  buttonClass += "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 active:scale-[0.98]";
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-center">
                      <span className="font-medium mr-3 text-gray-500">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span className="flex-1">{choice}</span>
                      {isAnswered && index === currentQuestion.correct_answer && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {isAnswered && index === selectedAnswer && selectedAnswer !== currentQuestion.correct_answer && (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {isAnswered && (
              <div className="mt-8 text-center">
                <Button 
                  onClick={handleNextQuestion}
                  size="lg"
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  {currentQuestionIndex < questions.length - 1 ? "次の問題へ" : "結果を見る"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
