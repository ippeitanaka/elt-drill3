"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getCurrentUser } from "@/lib/auth"
import type { User } from "@/lib/types"
import { AuthForm } from "./auth-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole?: "admin" | "student"
  fallback?: React.ReactNode
}

export function RoleGuard({ children, requiredRole = "student", fallback }: RoleGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return fallback || <AuthForm />
  }

  // Check role permission
  if (requiredRole === "admin" && user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-red-800">アクセス拒否</CardTitle>
            <CardDescription>このページには管理者権限が必要です</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              現在のアカウント: {user.name} ({user.role === "student" ? "学生" : user.role})
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/">ホームに戻る</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/login">管理者としてログイン</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
