"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Medal, Star, TrendingUp, Flame, Crown, Zap, Brain } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import type { UserProfile, UserStats, Achievement } from "@/lib/types"
import { calculateLevel, getLevelInfo, getUserRank } from "@/lib/gamification"

interface LeaderboardEntry extends UserProfile {
  rank: number
  levelInfo: ReturnType<typeof getLevelInfo>
  stats: UserStats
}

export function GameifiedLeaderboard() {
  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([])
  const [weeklyPlayers, setWeeklyPlayers] = useState<LeaderboardEntry[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboardData()
  }, [])

  const loadLeaderboardData = async () => {
    try {
      // トップユーザーを取得（全期間）
      const { data: topUsers, error: topError } = await supabase
        .from('profiles')
        .select(`
          *,
          quiz_sessions(
            score,
            correct_answers,
            total_questions,
            completed_at
          )
        `)
        .order('experience_points', { ascending: false })
        .limit(10)

      if (topError) throw topError

      // 週間ランキング用のデータを取得
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const { data: weeklyUsers, error: weeklyError } = await supabase
        .from('profiles')
        .select(`
          *,
          quiz_sessions!inner(
            score,
            correct_answers,
            total_questions,
            completed_at
          )
        `)
        .gte('quiz_sessions.completed_at', oneWeekAgo.toISOString())
        .order('experience_points', { ascending: false })
        .limit(10)

      if (weeklyError) throw weeklyError

      // アチーブメントを取得
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('points_reward', { ascending: false })

      if (achievementsError) throw achievementsError

      // リーダーボードエントリーを構築
      const buildLeaderboardEntries = (users: any[]): LeaderboardEntry[] => {
        return users.map((user, index) => {
          const totalQuizzes = user.quiz_sessions?.length || 0
          const totalQuestions = user.quiz_sessions?.reduce((sum: number, session: any) => 
            sum + session.total_questions, 0) || 0
          const totalCorrect = user.quiz_sessions?.reduce((sum: number, session: any) => 
            sum + session.correct_answers, 0) || 0
          
          const stats: UserStats = {
            totalQuizzes,
            totalQuestions,
            correctAnswers: totalCorrect,
            averageScore: totalQuizzes > 0 ? user.total_score / totalQuizzes : 0,
            currentStreak: 0, // ストリークの計算は複雑なので簡略化
            longestStreak: 0,
            accuracyRate: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0
          }

          return {
            ...user,
            rank: index + 1,
            levelInfo: getLevelInfo(user.experience_points),
            stats
          }
        })
      }

      setTopPlayers(buildLeaderboardEntries(topUsers))
      setWeeklyPlayers(buildLeaderboardEntries(weeklyUsers))
      setAchievements(achievementsData || [])

    } catch (error: any) {
      console.error('リーダーボード読み込みエラー:', error)
      toast({
        title: "データ読み込みエラー",
        description: "リーダーボードの読み込みに失敗しました。",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</span>
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-yellow-400 to-yellow-600"
      case 2:
        return "from-gray-300 to-gray-500"
      case 3:
        return "from-amber-400 to-amber-600"
      default:
        return "from-gray-100 to-gray-200"
    }
  }

  const LeaderboardCard = ({ player }: { player: LeaderboardEntry }) => (
    <Card className={`relative overflow-hidden ${player.rank <= 3 ? 'ring-2 ring-offset-2' : ''} ${
      player.rank === 1 ? 'ring-yellow-400' : 
      player.rank === 2 ? 'ring-gray-400' : 
      player.rank === 3 ? 'ring-amber-400' : ''
    }`}>
      <div className={`absolute inset-0 bg-gradient-to-r ${getRankColor(player.rank)} opacity-10`} />
      <CardContent className="p-4 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {getRankIcon(player.rank)}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {player.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{player.username || 'Unknown User'}</h3>
              <Badge variant="secondary" className="text-xs">
                Lv.{player.levelInfo.level}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span>{player.experience_points} XP</span>
              </div>
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-blue-500" />
                <span>{player.total_score}点</span>
              </div>
              <div className="flex items-center gap-1">
                <Brain className="h-3 w-3 text-purple-500" />
                <span>{player.stats.totalQuizzes}回</span>
              </div>
              {player.stats.accuracyRate > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span>{player.stats.accuracyRate.toFixed(1)}%</span>
                </div>
              )}
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>レベル進捗</span>
                <span>{player.levelInfo.currentXP}/{player.levelInfo.xpToNext}</span>
              </div>
              <Progress 
                value={(player.levelInfo.currentXP / player.levelInfo.xpToNext) * 100} 
                className="h-2 mt-1" 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          🏆 リーダーボード
        </h1>
        <p className="text-gray-600">トップユーザーの成績と実績を確認しましょう</p>
      </div>

      <Tabs defaultValue="overall" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overall" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            総合ランキング
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            週間ランキング
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            アチーブメント
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overall" className="space-y-4">
          <div className="grid gap-3">
            {topPlayers.length > 0 ? (
              topPlayers.map((player) => (
                <LeaderboardCard key={player.id} player={player} />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  まだユーザーデータがありません
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <div className="grid gap-3">
            {weeklyPlayers.length > 0 ? (
              weeklyPlayers.map((player) => (
                <LeaderboardCard key={player.id} player={player} />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  今週のデータがありません
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement) => (
              <Card key={achievement.id} className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-blue-100 opacity-50" />
                <CardHeader className="relative pb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div>
                      <CardTitle className="text-sm">{achievement.name}</CardTitle>
                      <p className="text-xs text-gray-600">{achievement.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative pt-0">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {achievement.points_reward} XP
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {achievement.condition_type}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
