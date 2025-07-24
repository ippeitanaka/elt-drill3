"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Crown, Info } from "lucide-react"
import { signIn, getCurrentUser, signOut } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export function AdminLoginCard() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleAdminLogin = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const email = formData.get("email") as string
      const password = formData.get("password") as string

      // Sign in with credentials
      await signIn(email, password)

      // Verify admin role
      const user = await getCurrentUser()
      if (user?.role !== "admin") {
        await signOut()
        throw new Error("このアカウントには管理者権限がありません")
      }

      toast({
        title: "管理者ログイン成功",
        description: `${user.name}さん、管理画面へようこそ`,
      })

      router.push("/admin")
    } catch (error: any) {
      toast({
        title: "管理者ログインエラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickLogin = async () => {
    setIsLoading(true)
    try {
      await signIn("elt@toyoiryo.ac.jp", "TOYOqq01")

      const user = await getCurrentUser()
      if (user?.role !== "admin") {
        await signOut()
        throw new Error("管理者権限の確認に失敗しました")
      }

      toast({
        title: "管理者ログイン成功",
        description: `${user.name}さん、管理画面へようこそ`,
      })

      router.push("/admin")
    } catch (error: any) {
      toast({
        title: "クイックログインエラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-purple-200">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-purple-100 rounded-full">
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-purple-800">管理者ログイン</CardTitle>
        <CardDescription>管理者権限でシステムにアクセス</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 予め設定された管理者アカウントの案内 */}
        <Alert className="border-purple-200 bg-purple-50">
          <Crown className="h-4 w-4 text-purple-600" />
          <AlertDescription>
            <strong>デフォルト管理者アカウント</strong>
            <br />
            メール: elt@toyoiryo.ac.jp
            <br />
            パスワード: TOYOqq01
          </AlertDescription>
        </Alert>

        {/* クイックログインボタン */}
        <Button onClick={handleQuickLogin} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700">
          {isLoading ? "ログイン中..." : "デフォルト管理者でログイン"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">または</span>
          </div>
        </div>

        {/* 手動ログインフォーム */}
        <form action={handleAdminLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">管理者メールアドレス</Label>
            <Input id="email" name="email" type="email" placeholder="admin@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="w-full border-purple-200 hover:bg-purple-50 bg-transparent"
            disabled={isLoading}
          >
            {isLoading ? "ログイン中..." : "カスタム管理者でログイン"}
          </Button>
        </form>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            管理者アカウントのみがこの画面からログインできます。 学生アカウントは通常のログイン画面をご利用ください。
          </AlertDescription>
        </Alert>

        <div className="text-center">
          <Button variant="link" onClick={() => router.push("/auth")}>
            通常ログインに戻る
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
