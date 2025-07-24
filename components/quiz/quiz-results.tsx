"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Clock, Target, CheckCircle, XCircle, RotateCcw } from "lucide-react"
import type { Question } from "@/lib/types"
import Link from "next/link"

interface QuizResultsProps {
  questions: Question[]
  answers: Record<string, string>
  score: number
  correctCount: number
  timeSpent: number
  categoryId: string
  onRetry: () => void
}

export function QuizResultsComponent({
  questions,
  answers,
  score,
  correctCount,
  timeSpent,
  categoryId,
  onRetry,
}: QuizResultsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { text: "優秀", variant: "default" as const, className: "bg-green-600" }
    if (score >= 70) return { text: "良好", variant: "secondary" as const, className: "bg-yellow-600" }
    return { text: "要復習", variant: "destructive" as const, className: "" }
  }

  const scoreBadge = getScoreBadge(score)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Results Summary */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Trophy className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">クイズ完了！</CardTitle>
          <CardDescription>お疲れさまでした。結果をご確認ください。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}点</div>
            <Badge className={scoreBadge.className} variant={scoreBadge.variant}>
              {scoreBadge.text}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={score} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0点</span>
              <span>100点</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">正答率</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {correctCount}/{questions.length}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">所要時間</span>
              </div>
              <div className="text-2xl font-bold">{formatTime(timeSpent)}</div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-medium">平均時間</span>
              </div>
              <div className="text-2xl font-bold">{formatTime(Math.floor(timeSpent / questions.length))}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>詳細結果（5択問題）</CardTitle>
          <CardDescription>各問題の正誤と解説をご確認ください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question, index) => {
            const userAnswer = answers[question.id]
            const isCorrect = userAnswer === question.correct_answer

            return (
              <div key={question.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">問題 {index + 1}</Badge>
                      {isCorrect ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <p className="font-medium mb-3">{question.question_text}</p>

                    <div className="space-y-1 text-sm">
                      {[
                        { key: "A", text: question.option_a },
                        { key: "B", text: question.option_b },
                        { key: "C", text: question.option_c },
                        { key: "D", text: question.option_d },
                        { key: "E", text: question.option_e },
                      ].map((option) => (
                        <div
                          key={option.key}
                          className={`flex items-center gap-2 ${
                            userAnswer === option.key
                              ? isCorrect
                                ? "text-green-600 font-medium"
                                : "text-red-600 font-medium"
                              : ""
                          }`}
                        >
                          <span>{option.key}.</span> {option.text}
                          {userAnswer === option.key && (
                            <Badge variant={isCorrect ? "default" : "destructive"} className="text-xs">
                              あなたの回答
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>

                    {!isCorrect && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-1 text-green-700 font-medium text-sm">
                          <CheckCircle className="h-3 w-3" />
                          正解: {question.correct_answer}
                        </div>
                      </div>
                    )}

                    {question.explanation && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-800">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={onRetry} variant="outline" className="flex items-center gap-2 bg-transparent">
          <RotateCcw className="h-4 w-4" />
          もう一度挑戦
        </Button>
        <Button asChild>
          <Link href={`/quiz/${categoryId}`}>設定を変更して再挑戦</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">ホームに戻る</Link>
        </Button>
      </div>
    </div>
  )
}
