"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CategorySelector } from "@/components/quiz/category-selector"
import { QuizRunner } from "@/components/quiz/quiz-runner"

export default function QuizPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSets, setSelectedSets] = useState<string[]>([])
  const [isQuizStarted, setIsQuizStarted] = useState(false)
  const router = useRouter()

  const handleStartQuiz = (categories: string[], sets: string[]) => {
    setSelectedCategories(categories)
    setSelectedSets(sets)
    setIsQuizStarted(true)
  }

  const handleQuizComplete = () => {
    setIsQuizStarted(false)
    setSelectedCategories([])
    setSelectedSets([])
    router.push("/leaderboard")
  }

  const handleBackToSelection = () => {
    setIsQuizStarted(false)
    setSelectedCategories([])
    setSelectedSets([])
  }

  if (isQuizStarted) {
    return (
      <QuizRunner
        selectedCategories={selectedCategories}
        selectedSets={selectedSets}
        onComplete={handleQuizComplete}
        onBack={handleBackToSelection}
      />
    )
  }

  return <CategorySelector onStartQuiz={handleStartQuiz} />
}
