"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { QuizSetup } from "@/components/quiz/quiz-setup"
import { QuizRunner } from "@/components/quiz/quiz-runner"
import { QuizResultsComponent } from "@/components/quiz/quiz-results"
import { Header } from "@/components/layout/header"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"
import type { Category, Question, User } from "@/lib/types"
import { AuthForm } from "@/components/auth/auth-form"

type QuizPhase = "setup" | "running" | "results"

interface QuizConfig {
  mode: "timed" | "all_questions" | "random"
  questionCount?: number
  timeLimit?: number
}

interface QuizResults {
  answers: Record<string, string>
  timeSpent: number
  score: number
  correctCount: number
}

export default function QuizPage() {
  const params = useParams()
  const categoryId = params.categoryId as string

  const [user, setUser] = useState<User | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([])
  const [phase, setPhase] = useState<QuizPhase>("setup")
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null)
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserAndLoadData()
  }, [categoryId])

  const checkUserAndLoadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      if (currentUser) {
        await Promise.all([loadCategory(), loadQuestions()])
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategory = async () => {
    const { data, error } = await supabase.from("categories").select("*").eq("id", categoryId).single()

    if (error) {
      console.error("Error loading category:", error)
      return
    }

    setCategory(data)
  }

  const loadQuestions = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select(`
        *,
        question_set:question_sets!inner(
          category_id
        )
      `)
      .eq("question_set.category_id", categoryId)
      .order("order_index")

    if (error) {
      console.error("Error loading questions:", error)
      return
    }

    setAllQuestions(data || [])
  }

  const handleQuizStart = (config: QuizConfig) => {
    setQuizConfig(config)

    let questions = [...allQuestions]

    if (config.mode === "random" && config.questionCount) {
      // Shuffle and take specified number of questions
      questions = questions.sort(() => Math.random() - 0.5).slice(0, config.questionCount)
    }

    setQuizQuestions(questions)
    setPhase("running")
  }

  const handleQuizComplete = async (results: QuizResults) => {
    setQuizResults(results)

    // Save study session to database
    try {
      const questionSetId = quizQuestions[0]?.question_set_id

      if (questionSetId && user) {
        const { error } = await supabase.from("study_sessions").insert({
          user_id: user.id,
          question_set_id: questionSetId,
          score: results.score,
          correct_count: results.correctCount,
          total_questions: quizQuestions.length,
          time_taken: results.timeSpent,
          quiz_mode: quizConfig?.mode || "all_questions",
        })

        if (error) {
          console.error("Error saving study session:", error)
        }
      }
    } catch (error) {
      console.error("Error saving results:", error)
    }

    setPhase("results")
  }

  const handleRetry = () => {
    setPhase("setup")
    setQuizResults(null)
    setQuizQuestions([])
    setQuizConfig(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">カテゴリーが見つかりません</h1>
            <p className="text-muted-foreground mt-2">指定されたカテゴリーは存在しないか、アクセスできません。</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container py-8">
        {phase === "setup" && (
          <QuizSetup categoryName={category.name} totalQuestions={allQuestions.length} onStart={handleQuizStart} />
        )}

        {phase === "running" && quizQuestions.length > 0 && (
          <QuizRunner questions={quizQuestions} timeLimit={quizConfig?.timeLimit} onComplete={handleQuizComplete} />
        )}

        {phase === "results" && quizResults && (
          <QuizResultsComponent
            questions={quizQuestions}
            answers={quizResults.answers}
            score={quizResults.score}
            correctCount={quizResults.correctCount}
            timeSpent={quizResults.timeSpent}
            categoryId={categoryId}
            onRetry={handleRetry}
          />
        )}
      </main>
    </div>
  )
}
