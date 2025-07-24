"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export function EnvCheck() {
  const envVars = [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      value: process.env.NEXT_PUBLIC_SUPABASE_URL,
      required: true,
      type: "public",
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      required: true,
      type: "public",
    },
  ]

  const getStatus = (value: string | undefined, required: boolean) => {
    if (!value && required) return "missing"
    if (!value && !required) return "optional"
    return "present"
  }

  const getIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "missing":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "optional":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "present":
        return "default"
      case "missing":
        return "destructive"
      case "optional":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          環境変数チェック
        </CardTitle>
        <CardDescription>クライアントサイドで利用可能な環境変数の状態を確認します</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {envVars.map((env) => {
            const status = getStatus(env.value, env.required)
            return (
              <div key={env.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getIcon(status)}
                  <div>
                    <p className="font-medium">{env.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {env.type === "public" ? "クライアント変数" : "サーバー変数"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getBadgeVariant(status) as any}>
                    {status === "present" ? "設定済み" : status === "missing" ? "未設定" : "オプション"}
                  </Badge>
                  {env.value && (
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{env.value.substring(0, 20)}...</code>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">サーバー変数について</h4>
          <p className="text-sm text-blue-700">
            SUPABASE_SERVICE_ROLE_KEY と ADMIN_SETUP_KEY はサーバーサイドでのみ利用可能で、
            このコンポーネントでは確認できません。Vercelダッシュボードで設定を確認してください。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
