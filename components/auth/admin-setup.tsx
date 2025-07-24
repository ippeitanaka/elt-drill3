"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertCircle, CheckCircle, Info } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

export function AdminSetup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    adminKey: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"verify" | "create">("verify")

  const handleVerifyKey = async () => {
    if (!formData.adminKey.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/verify-admin-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: formData.adminKey }),
      })
      const data = await res.json()

      if (!data.valid) {
        toast({
          title: "認証失敗",
          description: "管理者キーが正しくありません。",
          variant: "destructive",
        })
        return
      }

      setStep("create")
      toast({
        title: "認証成功",
        description: "管理者アカウントを作成できます。",
      })
    } catch (error: any) {
      toast({
        title: "キー検証エラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "パスワードエラー",
        description: "パスワードが一致しません。",
        variant: "destructive",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "パスワードエラー",
        description: "パスワードは6文字以上で入力してください。",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create user account
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        // Update user role to admin
        const { error: updateError } = await supabase.from("users").update({ role: "admin" }).eq("id", data.user.id)

        if (updateError) throw updateError

        toast({
          title: "管理者アカウント作成完了",
          description: "管理者アカウントが正常に作成されました。確認メールをご確認ください。",
        })

        // Reset form
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          adminKey: "",
        })
        setStep("verify")
      }
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">管理者セットアップ</CardTitle>
          <CardDescription>
            {step === "verify" ? "管理者キーを入力してください" : "管理者アカウントを作成します"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 予め設定された管理者アカウントの案内 */}
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>予め設定された管理者アカウント:</strong>
              <br />
              メール: elt@toyoiryo.ac.jp
              <br />
              パスワード: TOYOqq01
              <br />
              <Button variant="link" className="p-0 h-auto" onClick={() => (window.location.href = "/auth")}>
                こちらから直接ログインできます
              </Button>
            </AlertDescription>
          </Alert>

          {step === "verify" ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>追加の管理者アカウントを作成する場合は、管理者キーが必要です。</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="adminKey">管理者キー</Label>
                <Input
                  id="adminKey"
                  type="password"
                  value={formData.adminKey}
                  onChange={(e) => setFormData({ ...formData, adminKey: e.target.value })}
                  placeholder="管理者キーを入力"
                />
                <p className="text-xs text-muted-foreground">
                  デモ用キーは環境変数 <code>ADMIN_SETUP_KEY</code> に設定してください
                </p>
              </div>

              <Button onClick={handleVerifyKey} className="w-full" disabled={!formData.adminKey.trim()}>
                認証
              </Button>

              <div className="text-center">
                <Button variant="link" onClick={() => (window.location.href = "/auth")}>
                  通常ログインに戻る
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>認証が完了しました。追加管理者アカウント情報を入力してください。</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="name">管理者名</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="山田太郎"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  minLength={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード確認</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  minLength={6}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "作成中..." : "追加管理者アカウント作成"}
              </Button>

              <div className="text-center">
                <Button variant="link" onClick={() => setStep("verify")}>
                  戻る
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
