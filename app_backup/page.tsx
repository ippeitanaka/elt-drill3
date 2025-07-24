"use client"

import { useState, useEffect } from "react"
import { CategoryCard } from "@/components/categories/category-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Clock, Target, TrendingUp, Shield } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"
import type { Category, StudySession, User } from "@/lib/types"
import { AuthForm } from "@/components/auth/auth-form"
import { Header } from "@/components/layout/header"
import Link from "next/link"

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      if (currentUser) {
        await Promise.all([loadCategories(), loadRecentSessions(currentUser.id)])
      }
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) {
      console.error("Error loading categories:", error)
      return
    }

    setCategories(data || [])
  }

  const loadRecentSessions = async (userId: string) => {
    const { data, error } = await supabase
      .from("study_sessions")
      .select(`
        *,
        question_set:question_sets(
          title,
          category:categories(name, color)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) {
      console.error("Error loading recent sessions:", error)
      return
    }

    setRecentSessions(data || [])
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

  const totalSessions = recentSessions.length
  const averageScore =
    totalSessions > 0 ? Math.round(recentSessions.reduce((sum, session) => sum + session.score, 0) / totalSessions) : 0
  const bestScore = totalSessions > 0 ? Math.max(...recentSessions.map((session) => session.score)) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container py-8 space-y-8">
        {/* Admin Access Card */}
        {!user && (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-800">管理者の方はこちら</h3>
                  <p className="text-sm text-purple-600">システム管理とコンテンツ管理</p>
                </div>
              </div>
              <Button asChild variant="outline" className="border-purple-200 hover:bg-purple-100 bg-transparent">
                <Link href="/admin/login">管理者ログイン</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">おかえりなさい、{user.name}さん</h1>
          <p className="text-muted-foreground">救急医療技術者試験の準備を続けましょう</p>
        </div>

        {/* Stats Overview */}
        {totalSessions > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mr-4">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">平均スコア</p>
                  <p className="text-2xl font-bold">{averageScore}点</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
                  <Trophy className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">最高スコア</p>
                  <p className="text-2xl font-bold">{bestScore}点</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mr-4">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">完了セッション</p>
                  <p className="text-2xl font-bold">{totalSessions}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">学習カテゴリー</h2>
            {user.role === "admin" && (
              <Button asChild variant="outline">
                <Link href="/admin">管理画面</Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        {recentSessions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">最近の学習履歴</h2>
              <Button asChild variant="outline">
                <Link href="/history">すべて見る</Link>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  学習履歴
                </CardTitle>
                <CardDescription>最近完了したクイズセッション</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full bg-${session.question_set?.category?.color || "blue"}-500`}
                        />
                        <div>
                          <p className="font-medium">{session.question_set?.title}</p>
                          <p className="text-sm text-muted-foreground">{session.question_set?.category?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={session.score >= 80 ? "default" : session.score >= 60 ? "secondary" : "destructive"}
                        >
                          {session.score}点
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.created_at).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  )
}
