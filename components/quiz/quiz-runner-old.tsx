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

export function QuizRunner({ questions, timeLimit, onComplete }: QuizRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [startTime] = useState(Date.now())
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [showResults, setShowResults] = useState(false)

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  // Timer effect
  useEffect(() => {
    if (!timeLimit) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev && prev <= 1) {
          handleComplete()
          return 0
        }
        return prev ? prev - 1 : 0
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLimit])

  const handleAnswerSelect = (answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }))
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleComplete = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000)
    const correctCount = questions.reduce((count, question) => {
      return answers[question.id] === question.correct_answer ? count + 1 : count
    }, 0)
    const score = Math.round((correctCount / questions.length) * 100)

    onComplete({
      answers,
      timeSpent,
      score,
      correctCount,
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!currentQuestion) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            問題 {currentIndex + 1} / {questions.length}
          </Badge>
          <Badge
            variant="secondary"
            className={
              currentQuestion.difficulty === "hard"
                ? "bg-red-100 text-red-700"
                : currentQuestion.difficulty === "medium"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
            }
          >
            {currentQuestion.difficulty === "easy" ? "易" : currentQuestion.difficulty === "medium" ? "中" : "難"}
          </Badge>
        </div>

        {timeLimit && timeLeft !== undefined && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className={`font-mono ${timeLeft < 60 ? "text-red-600" : ""}`}>{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Progress */}
      <Progress value={progress} className="w-full" />

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg leading-relaxed">{currentQuestion.question_text}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[currentQuestion.id] || ""}
            onValueChange={handleAnswerSelect}
            className="space-y-3"
          >
            {[
              { value: "A", text: currentQuestion.option_a },
              { value: "B", text: currentQuestion.option_b },
              { value: "C", text: currentQuestion.option_c },
              { value: "D", text: currentQuestion.option_d },
              { value: "E", text: currentQuestion.option_e },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                  <span className="font-medium mr-2">{option.value}.</span>
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={currentIndex === 0}>
          前の問題
        </Button>

        <div className="flex gap-2">
          {currentIndex === questions.length - 1 ? (
            <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
              完了
            </Button>
          ) : (
            <Button onClick={handleNext}>次の問題</Button>
          )}
        </div>
      </div>

      {/* Question Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-10 gap-2">
            {questions.map((_, index) => (
              <Button
                key={index}
                variant={index === currentIndex ? "default" : answers[questions[index].id] ? "secondary" : "outline"}
                size="sm"
                onClick={() => setCurrentIndex(index)}
                className="aspect-square p-0"
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
