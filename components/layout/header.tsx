"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Heart, LogOut, Settings, Trophy, User } from "lucide-react"
import { signOut, getCurrentUser } from "@/lib/auth"
import type { User as UserType } from "@/lib/types"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AdminStatusBadge } from "@/components/auth/admin-status-badge"

export function Header() {
  const [user, setUser] = useState<UserType | null>(null)
  const router = useRouter()

  useEffect(() => {
    getCurrentUser().then(setUser)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push("/auth")
  }

  if (!user) return null

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Heart className="h-6 w-6 text-red-500" />
          <span className="text-xl font-bold">救急医療ドリル</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/" className="text-sm font-medium hover:text-primary">
            ホーム
          </Link>
          <Link href="/leaderboard" className="text-sm font-medium hover:text-primary">
            ランキング
          </Link>
          <Link href="/badges" className="text-sm font-medium hover:text-primary">
            バッジ
          </Link>
          {user.role === "admin" ? (
            <Link href="/admin" className="text-sm font-medium hover:text-primary">
              管理画面
            </Link>
          ) : (
            <Link href="/admin/login" className="text-sm font-medium hover:text-primary text-purple-600">
              管理者ログイン
            </Link>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {user.role === "admin" && <AdminStatusBadge />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  プロフィール
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/badges">
                  <Trophy className="mr-2 h-4 w-4" />
                  バッジ
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                設定
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
