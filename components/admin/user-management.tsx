"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, UserPlus, Crown, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import type { User as UserType } from "@/lib/types"

interface UserWithStats extends UserType {
  total_sessions?: number
  average_score?: number
  last_activity?: string
}

export function UserManagement() {
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "admin">("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter])

  const loadUsers = async () => {
    try {
      // Load users with their statistics
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })

      if (usersError) throw usersError

      // Load user statistics
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("study_sessions")
        .select("user_id, score, created_at")

      if (sessionsError) throw sessionsError

      // Combine user data with statistics
      const usersWithStats: UserWithStats[] = usersData.map((user) => {
        const userSessions = sessionsData.filter((session) => session.user_id === user.id)
        const totalSessions = userSessions.length
        const averageScore =
          totalSessions > 0
            ? Math.round(userSessions.reduce((sum, session) => sum + session.score, 0) / totalSessions)
            : 0
        const lastActivity =
          userSessions.length > 0
            ? userSessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                .created_at
            : null

        return {
          ...user,
          total_sessions: totalSessions,
          average_score: averageScore,
          last_activity: lastActivity,
        }
      })

      setUsers(usersWithStats)
    } catch (error: any) {
      toast({
        title: "ユーザー読み込みエラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }

  const handleRoleChange = async (userId: string, newRole: "student" | "admin") => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", userId)

      if (error) throw error

      toast({
        title: "ロール更新完了",
        description: `ユーザーのロールを${newRole === "admin" ? "管理者" : "学生"}に変更しました。`,
      })

      loadUsers()
    } catch (error: any) {
      toast({
        title: "ロール更新エラー",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getRoleIcon = (role: string) => {
    return role === "admin" ? <Crown className="h-4 w-4" /> : <User className="h-4 w-4" />
  }

  const getRoleBadge = (role: string) => {
    return role === "admin" ? (
      <Badge className="bg-purple-600 hover:bg-purple-700">
        <Crown className="h-3 w-3 mr-1" />
        管理者
      </Badge>
    ) : (
      <Badge variant="secondary">
        <User className="h-3 w-3 mr-1" />
        学生
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">ユーザー管理</h3>
        <Button variant="outline" onClick={() => window.open("/admin/setup", "_blank")}>
          <UserPlus className="h-4 w-4 mr-2" />
          管理者追加
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">検索</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="名前またはメールアドレスで検索"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>ロールフィルター</Label>
              <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="student">学生</SelectItem>
                  <SelectItem value="admin">管理者</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <CardDescription>
            全{users.length}名のユーザー（表示中: {filteredUsers.length}名）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{user.name}</h4>
                      {getRoleBadge(user.role)}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>登録: {new Date(user.created_at).toLocaleDateString("ja-JP")}</span>
                      {user.last_activity && (
                        <span>最終活動: {new Date(user.last_activity).toLocaleDateString("ja-JP")}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="font-medium">{user.total_sessions || 0}回学習</div>
                    <div className="text-muted-foreground">平均 {user.average_score || 0}点</div>
                  </div>

                  <Select
                    value={user.role}
                    onValueChange={(newRole: "student" | "admin") => handleRoleChange(user.id, newRole)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          学生
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Crown className="h-3 w-3" />
                          管理者
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || roleFilter !== "all" ? "条件に一致するユーザーが見つかりません" : "ユーザーがいません"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
