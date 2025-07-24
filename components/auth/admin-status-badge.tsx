"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Crown, User } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import type { User as UserType } from "@/lib/types"

export function AdminStatusBadge() {
  const [user, setUser] = useState<UserType | null>(null)

  useEffect(() => {
    getCurrentUser().then(setUser)
  }, [])

  if (!user) return null

  if (user.role === "admin") {
    return (
      <Badge className="bg-purple-600 hover:bg-purple-700">
        <Crown className="h-3 w-3 mr-1" />
        管理者
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      <User className="h-3 w-3 mr-1" />
      学生
    </Badge>
  )
}
