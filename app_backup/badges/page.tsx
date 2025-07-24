"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Award, Star, Zap, Target, Clock, Flame } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getCurrentUser } from "@/lib/auth"
import type { User, Badge as BadgeType, UserBadge } from "@/lib/types"
import { AuthForm } from "@/components/auth/auth-form"

export default function BadgesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [allBadges, setAllBadges] = useState<BadgeType[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserAndLoadData()
  }, [])

  const checkUserAndLoadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      if (currentUser) {
        await Promise.all([loadAllBadges(), loadUserBadges(currentUser.id)])
      }
    } catch (error) {
      console.error("Error loading badges:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllBadges = async () => {
    const { data, error } = await supabase.from("badges").select("*").order("name")

    if (error) {
      console.error("Error loading badges:", error)
      return
    }

    setAllBadges(data || [])
  }

  const loadUserBadges = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_badges")
      .select(`
        *,
        badge:badges(*)
      `)
      .eq("user_id", userId)
      .order("earned_at", { ascending: false })

    if (error) {
      console.error("Error loading user badges:", error)
      return
    }

    setUserBadges(data || [])
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

  const getIconComponent = (iconName: string) => {
    const icons = {
      trophy: Trophy,
      award: Award,
      star: Star,
      zap: Zap,
      target: Target,
      clock: Clock,
      flame: Flame,
    }
    return icons[iconName as keyof typeof icons] || Trophy
  }

  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container py-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">バッジコレクション</h1>
          <p className="text-muted-foreground">学習の成果を確認しましょう</p>
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              獲得済み: {userBadges.length}個
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              全体: {allBadges.length}個
            </Badge>
          </div>
        </div>

        {/* Earned Badges */}
        {userBadges.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">獲得済みバッジ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userBadges.map((userBadge) => {
                const badge = userBadge.badge!
                const IconComponent = getIconComponent(badge.icon)

                return (
                  <Card key={userBadge.id} className="border-2 border-yellow-200 bg-yellow-50">
                    <CardContent className="flex flex-col items-center p-6 text-center">
                      <div
                        className={`w-16 h-16 bg-${badge.color}-100 rounded-full flex items-center justify-center mb-4`}
                      >
                        <IconComponent className={`h-8 w-8 text-${badge.color}-600`} />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{badge.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{badge.description}</p>
                      <Badge className="bg-yellow-500 hover:bg-yellow-600">獲得済み</Badge>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(userBadge.earned_at).toLocaleDateString("ja-JP")}
                      </p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* All Badges */}
        <section>
          <h2 className="text-2xl font-bold mb-6">全バッジ一覧</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allBadges.map((badge) => {
              const IconComponent = getIconComponent(badge.icon)
              const isEarned = earnedBadgeIds.has(badge.id)

              return (
                <Card key={badge.id} className={`${isEarned ? "border-yellow-200 bg-yellow-50" : "opacity-60"}`}>
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div
                      className={`w-16 h-16 bg-${badge.color}-100 rounded-full flex items-center justify-center mb-4 ${!isEarned ? "grayscale" : ""}`}
                    >
                      <IconComponent className={`h-8 w-8 text-${badge.color}-600`} />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{badge.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{badge.description}</p>

                    {isEarned ? (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600">獲得済み</Badge>
                    ) : (
                      <Badge variant="outline">未獲得</Badge>
                    )}

                    {badge.condition_type && badge.condition_value && (
                      <p className="text-xs text-muted-foreground mt-2">
                        条件:{" "}
                        {badge.condition_type === "perfect_score"
                          ? `${badge.condition_value}点獲得`
                          : badge.condition_type === "streak"
                            ? `${badge.condition_value}日連続学習`
                            : badge.condition_type === "total_completed"
                              ? `${badge.condition_value}問完了`
                              : badge.condition_type === "speed"
                                ? `制限時間の${badge.condition_value}%以内で完了`
                                : "特別な条件"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Progress Section */}
        <Card>
          <CardHeader>
            <CardTitle>バッジ獲得の進捗</CardTitle>
            <CardDescription>次のバッジ獲得まであと少し！</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>バッジ獲得率</span>
                <span className="font-semibold">{Math.round((userBadges.length / allBadges.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(userBadges.length / allBadges.length) * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {allBadges.length - userBadges.length}個のバッジが獲得可能です
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
