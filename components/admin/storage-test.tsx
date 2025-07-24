"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Upload, Database } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

export function StorageTest() {
  const [testFile, setTestFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [storageStatus, setStorageStatus] = useState<"checking" | "success" | "error" | null>(null)

  const checkStorageSetup = async () => {
    setStorageStatus("checking")
    try {
      // バケットの存在確認
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

      if (bucketsError) {
        throw new Error(`バケット確認エラー: ${bucketsError.message}`)
      }

      const pdfsBucket = buckets.find((bucket) => bucket.name === "pdfs")

      if (!pdfsBucket) {
        throw new Error("pdfsバケットが見つかりません。ストレージ設定を確認してください。")
      }

      // テストファイルのリスト取得
      const { data: files, error: filesError } = await supabase.storage.from("pdfs").list("", { limit: 1 })

      if (filesError) {
        throw new Error(`ファイルリスト取得エラー: ${filesError.message}`)
      }

      setStorageStatus("success")
      toast({
        title: "ストレージ確認完了",
        description: "Supabaseストレージが正常に設定されています。",
      })
    } catch (error: any) {
      setStorageStatus("error")
      toast({
        title: "ストレージエラー",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const testFileUpload = async () => {
    if (!testFile) {
      toast({
        title: "ファイルが選択されていません",
        description: "テスト用のファイルを選択してください。",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      const fileName = `test_${Date.now()}_${testFile.name}`

      const { data, error } = await supabase.storage.from("pdfs").upload(fileName, testFile)

      if (error) {
        throw new Error(`アップロードエラー: ${error.message}`)
      }

      setUploadResult(`成功: ${data.path}`)
      toast({
        title: "テストアップロード成功",
        description: "ファイルが正常にアップロードされました。",
      })

      // テストファイルを削除
      await supabase.storage.from("pdfs").remove([fileName])
    } catch (error: any) {
      setUploadResult(`エラー: ${error.message}`)
      toast({
        title: "テストアップロードエラー",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "checking":
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-600">正常</Badge>
      case "error":
        return <Badge variant="destructive">エラー</Badge>
      case "checking":
        return <Badge variant="secondary">確認中</Badge>
      default:
        return <Badge variant="outline">未確認</Badge>
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          ストレージテスト
        </CardTitle>
        <CardDescription>Supabaseストレージの設定と動作を確認します</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ストレージ設定確認 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">ストレージ設定確認</h4>
            <div className="flex items-center gap-2">
              {getStatusIcon(storageStatus)}
              {getStatusBadge(storageStatus)}
            </div>
          </div>
          <Button onClick={checkStorageSetup} disabled={storageStatus === "checking"}>
            {storageStatus === "checking" ? "確認中..." : "ストレージ設定を確認"}
          </Button>
        </div>

        {/* ファイルアップロードテスト */}
        <div className="space-y-3">
          <h4 className="font-medium">ファイルアップロードテスト</h4>
          <div className="space-y-2">
            <Input
              type="file"
              onChange={(e) => setTestFile(e.target.files?.[0] || null)}
              accept=".pdf,.txt,.jpg,.png"
            />
            <Button onClick={testFileUpload} disabled={!testFile || isUploading} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "アップロード中..." : "テストアップロード"}
            </Button>
          </div>
          {uploadResult && (
            <div
              className={`p-3 rounded-lg text-sm ${
                uploadResult.startsWith("成功")
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {uploadResult}
            </div>
          )}
        </div>

        {/* 設定手順 */}
        <div className="space-y-3">
          <h4 className="font-medium">設定手順</h4>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Supabaseダッシュボードにログイン</li>
              <li>2. Storage → Create bucket → "pdfs"を作成</li>
              <li>3. SQL Editor で scripts/08-setup-storage.sql を実行</li>
              <li>4. 上記のテストを実行して動作確認</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
