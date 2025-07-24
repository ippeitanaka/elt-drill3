"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trophy, Medal, Award, Target } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"
import type { User } from "@/lib/types"
import { AuthForm } from "@/components/auth/auth-form"

interface LeaderboardEntry {
  user_id: string
  user_name: string
  average_score: number
  total_sessions: number
  best_score: number
  total_questions: number
}

export default function LeaderboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserAndLoadData()
  }, [])

  const checkUserAndLoadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      if (currentUser) {
        await loadLeaderboard()
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadLeaderboard = async () => {
    const { data, error } = await supabase.from("study_sessions").select(`
        user_id,
        score,
        total_questions,
        user:users(name)
      `)

    if (error) {
      console.error("Error loading leaderboard:", error)
      return
    }

    // Process data to create leaderboard
    const userStats = new Map<
      string,
      {
        user_name: string
        scores: number[]
        total_questions: number
      }
    >()

    data.forEach((session) => {
      const userId = session.user_id
      const userName = session.user?.name || "Unknown"

      if (!userStats.has(userId)) {
        userStats.set(userId, {
          user_name: userName,
          scores: [],
          total_questions: 0,
        })
      }

      const stats = userStats.get(userId)!
      stats.scores.push(session.score)
      stats.total_questions += session.total_questions
    })

    const leaderboardData: LeaderboardEntry[] = Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        user_id: userId,
        user_name: stats.user_name,
        average_score: Math.round(stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length),
        total_sessions: stats.scores.length,
        best_score: Math.max(...stats.scores),
        total_questions: stats.total_questions,
      }))
      .sort((a, b) => b.average_score - a.average_score)

    setLeaderboard(leaderboardData)
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">1位</Badge>
      case 2:
        return <Badge className="bg-gray-400 hover:bg-gray-500">2位</Badge>
      case 3:
        return <Badge className="bg-amber-600 hover:bg-amber-700">3位</Badge>
      default:
        return <Badge variant="outline">{rank}位</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container py-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">ランキング</h1>
          <p className="text-muted-foreground">学習者の成績ランキング</p>
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* 2nd Place */}
            <Card className="order-1 md:order-1">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Medal className="h-8 w-8 text-gray-400" />
                </div>
                <Avatar className="w-12 h-12 mb-2">
                  <AvatarFallback>{leaderboard[1].user_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold">{leaderboard[1].user_name}</h3>
                <p className="text-2xl font-bold text-gray-600">{leaderboard[1].average_score}点</p>
                <Badge className="bg-gray-400 hover:bg-gray-500 mt-2">2位</Badge>
              </CardContent>
            </Card>

            {/* 1st Place */}
            <Card className="order-2 md:order-2 border-yellow-200 bg-yellow-50">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <Trophy className="h-10 w-10 text-yellow-500" />
                </div>
                <Avatar className="w-16 h-16 mb-2">
                  <AvatarFallback>{leaderboard[0].user_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{leaderboard[0].user_name}</h3>
                <p className="text-3xl font-bold text-yellow-600">{leaderboard[0].average_score}点</p>
                <Badge className="bg-yellow-500 hover:bg-yellow-600 mt-2">1位</Badge>
              </CardContent>
            </Card>

            {/* 3rd Place */}
            <Card className="order-3 md:order-3">
              <CardContent className="flex flex-col items-center p-6 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <Award className="h-8 w-8 text-amber-600" />
                </div>
                <Avatar className="w-12 h-12 mb-2">
                  <AvatarFallback>{leaderboard[2].user_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold">{leaderboard[2].user_name}</h3>
                <p className="text-2xl font-bold text-amber-600">{leaderboard[2].average_score}点</p>
                <Badge className="bg-amber-600 hover:bg-amber-700 mt-2">3位</Badge>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              全体ランキング
            </CardTitle>
            <CardDescription>平均スコア順のランキング</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboard.map((entry, index) => {
                const rank = index + 1
                const isCurrentUser = entry.user_id === user?.id

                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      isCurrentUser ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12">{getRankIcon(rank)}</div>
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>{entry.user_name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {entry.user_name}
                            {isCurrentUser && (
                              <Badge variant="outline" className="ml-2">
                                あなた
                              </Badge>
                            )}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {entry.total_sessions}回学習 • 最高{entry.best_score}点
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {getRankBadge(rank)}
                      <p className="text-2xl font-bold mt-1">{entry.average_score}点</p>
                      <p className="text-sm text-muted-foreground">平均スコア</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
