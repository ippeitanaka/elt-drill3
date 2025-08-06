"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, CheckCircle, AlertCircle, FileText, Clock, Zap, Settings } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { Category } from "@/lib/types"

interface BatchUploadProps {
  categories?: Category[]
  onSuccess: () => void
  onClose: () => void
}

interface ProcessingProgress {
  currentPage: number
  totalPages: number
  extractedQuestions: number
  estimatedTimeRemaining?: number
  status: 'processing' | 'completed' | 'error'
  message?: string
}

interface BatchJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: ProcessingProgress
  error?: string
  createdAt: string
  updatedAt: string
}

export function BatchPDFUpload({ categories: passedCategories, onSuccess, onClose }: BatchUploadProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [questionFile, setQuestionFile] = useState<File | null>(null)
  const [answerFile, setAnswerFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [currentJob, setCurrentJob] = useState<BatchJob | null>(null)
  
  // バッチ処理設定
  const [batchSize, setBatchSize] = useState(5)
  const [maxPages, setMaxPages] = useState(100)
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')

  // カテゴリーの取得
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories-for-pdf')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCategories(data.categories || [])
        }
      }
    } catch (error) {
      console.error('カテゴリー取得エラー:', error)
    }
  }

  const handleBatchUpload = async () => {
    if (!questionFile || !selectedCategory) {
      toast({
        title: "必要な情報が不足しています",
        description: "カテゴリーと問題ファイルを選択してください。",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('questionFile', questionFile)
      if (answerFile) {
        formData.append('answerFile', answerFile)
      }
      formData.append('categoryId', selectedCategory)
      formData.append('batchSize', batchSize.toString())
      formData.append('maxPages', maxPages.toString())
      formData.append('quality', quality)

      const response = await fetch('/api/batch-ocr', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'バッチ処理の開始に失敗しました')
      }

      const result = await response.json()
      
      toast({
        title: "バッチ処理開始",
        description: `処理を開始しました。推定時間: ${result.estimatedTime}`,
      })

      // ジョブの監視を開始
      startJobMonitoring(result.jobId)

    } catch (error: any) {
      console.error("バッチ処理エラー:", error)
      toast({
        title: "バッチ処理エラー",
        description: error.message,
        variant: "destructive",
      })
      setIsUploading(false)
    }
  }

  const startJobMonitoring = (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/batch-ocr?jobId=${jobId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.job) {
            setCurrentJob(data.job)

            if (data.job.status === 'completed') {
              clearInterval(pollInterval)
              setIsUploading(false)
              toast({
                title: "処理完了",
                description: `${data.job.progress.extractedQuestions}問を正常に抽出・保存しました。`,
              })
              onSuccess()
            } else if (data.job.status === 'failed') {
              clearInterval(pollInterval)
              setIsUploading(false)
              toast({
                title: "処理エラー",
                description: data.job.error || "バッチ処理中にエラーが発生しました。",
                variant: "destructive",
              })
            }
          }
        }
      } catch (error) {
        console.error('ジョブ監視エラー:', error)
      }
    }, 2000) // 2秒ごとに確認

    // 30分後にタイムアウト
    setTimeout(() => {
      clearInterval(pollInterval)
      if (isUploading) {
        setIsUploading(false)
        toast({
          title: "タイムアウト",
          description: "処理に時間がかかりすぎています。しばらくしてから結果をご確認ください。",
          variant: "destructive",
        })
      }
    }, 30 * 60 * 1000)
  }

  const getQualityDescription = (q: string) => {
    switch (q) {
      case 'low': return '高速処理（精度: 低）'
      case 'medium': return 'バランス型（精度: 中）'
      case 'high': return '高精度処理（速度: 遅）'
      default: return ''
    }
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return '計算中...'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}分${remainingSeconds}秒`
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          大容量PDF バッチ処理アップロード
        </CardTitle>
        <CardDescription>
          大容量PDFファイルを最適化されたバッチ処理で効率的に処理します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">ファイルアップロード</TabsTrigger>
            <TabsTrigger value="settings">処理設定</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* カテゴリー選択 */}
              <div className="space-y-2">
                <Label htmlFor="category">カテゴリー</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリーを選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ファイル選択 */}
              <div className="space-y-2">
                <Label htmlFor="questionFile">問題ファイル (PDF)</Label>
                <Input
                  id="questionFile"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setQuestionFile(e.target.files?.[0] || null)}
                />
                {questionFile && (
                  <div className="text-sm text-gray-600">
                    ファイルサイズ: {(questionFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="answerFile">解答ファイル (PDF) - オプション</Label>
                <Input
                  id="answerFile"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setAnswerFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            {/* 進捗表示 */}
            {currentJob && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    処理進捗
                    <Badge variant={
                      currentJob.status === 'completed' ? 'default' :
                      currentJob.status === 'failed' ? 'destructive' :
                      'secondary'
                    }>
                      {currentJob.status === 'processing' ? '処理中' :
                       currentJob.status === 'completed' ? '完了' :
                       currentJob.status === 'failed' ? 'エラー' : '待機中'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>進捗:</span>
                      <span>{currentJob.progress.currentPage}/{currentJob.progress.totalPages}</span>
                    </div>
                    
                    <Progress 
                      value={currentJob.progress.totalPages > 0 
                        ? (currentJob.progress.currentPage / currentJob.progress.totalPages) * 100 
                        : 0} 
                    />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">抽出された問題:</span>
                        <span className="ml-2">{currentJob.progress.extractedQuestions}問</span>
                      </div>
                      <div>
                        <span className="font-medium">残り時間:</span>
                        <span className="ml-2">
                          {formatTime(currentJob.progress.estimatedTimeRemaining)}
                        </span>
                      </div>
                    </div>
                    
                    {currentJob.progress.message && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {currentJob.progress.message}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* アップロードボタン */}
            <div className="flex gap-2">
              <Button
                onClick={handleBatchUpload}
                disabled={!questionFile || !selectedCategory || isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    バッチ処理中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    バッチ処理開始
                  </>
                )}
              </Button>
              
              <Button variant="outline" onClick={onClose}>
                閉じる
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="batchSize">バッチサイズ</Label>
                <Select value={batchSize.toString()} onValueChange={(value) => setBatchSize(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 (低メモリ環境)</SelectItem>
                    <SelectItem value="5">5 (推奨)</SelectItem>
                    <SelectItem value="10">10 (高性能環境)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  同時に処理するページ数。大きいほど高速ですが、メモリを多く使用します。
                </p>
              </div>

              <div>
                <Label htmlFor="maxPages">最大ページ数</Label>
                <Select value={maxPages.toString()} onValueChange={(value) => setMaxPages(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50ページ</SelectItem>
                    <SelectItem value="100">100ページ (推奨)</SelectItem>
                    <SelectItem value="200">200ページ</SelectItem>
                    <SelectItem value="500">500ページ</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  処理する最大ページ数。大容量PDFの処理時間を制限できます。
                </p>
              </div>

              <div>
                <Label htmlFor="quality">処理品質</Label>
                <Select value={quality} onValueChange={(value: any) => setQuality(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低 {getQualityDescription('low')}</SelectItem>
                    <SelectItem value="medium">中 {getQualityDescription('medium')}</SelectItem>
                    <SelectItem value="high">高 {getQualityDescription('high')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  処理の精度と速度のバランスを選択できます。
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
