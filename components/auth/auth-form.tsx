"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { signIn, signUp, getCurrentUser, signOut } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignIn = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const email = formData.get("email") as string
      const password = formData.get("password") as string

      await signIn(email, password)
      toast({
        title: "ログイン成功",
        description: "アプリケーションにログインしました。",
      })
      router.push("/")
    } catch (error: any) {
      toast({
        title: "ログインエラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const email = formData.get("email") as string
      const password = formData.get("password") as string
      const name = formData.get("name") as string

      await signUp(email, password, name)
      toast({
        title: "アカウント作成成功",
        description: "確認メールをお送りしました。",
      })
    } catch (error: any) {
      toast({
        title: "アカウント作成エラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdminSignIn = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const email = formData.get("email") as string
      const password = formData.get("password") as string

      await signIn(email, password)

      // Check if user is admin
      const user = await getCurrentUser()
      if (user?.role !== "admin") {
        await signOut()
        throw new Error("管理者権限が必要です")
      }

      toast({
        title: "管理者ログイン成功",
        description: "管理画面にアクセスできます。",
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">救急医療ドリル</CardTitle>
          <CardDescription>救急医療技術者試験対策アプリ</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">ログイン</TabsTrigger>
              <TabsTrigger value="signup">新規登録</TabsTrigger>
              <TabsTrigger value="admin">管理者</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form action={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input id="email" name="email" type="email" placeholder="your@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "ログイン中..." : "ログイン"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form action={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">お名前</Label>
                  <Input id="name" name="name" type="text" placeholder="山田太郎" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input id="email" name="email" type="email" placeholder="your@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input id="password" name="password" type="password" minLength={6} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "アカウント作成中..." : "アカウント作成"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="admin">
              <form action={handleAdminSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">管理者メールアドレス</Label>
                  <Input id="admin-email" name="email" type="email" placeholder="admin@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">パスワード</Label>
                  <Input id="admin-password" name="password" type="password" required />
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
                  {isLoading ? "ログイン中..." : "管理者としてログイン"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-4 text-center">
            <Button variant="link" size="sm" onClick={() => (window.location.href = "/admin/setup")}>
              管理者アカウント作成
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
