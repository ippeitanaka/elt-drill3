'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react'

export default function OCRTestPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError(null)
    }
  }

  const simulateProgress = () => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + Math.random() * 10
      })
    }, 1000)
    return interval
  }

  const handleUpload = async () => {
    if (!file) return

    setIsProcessing(true)
    setError(null)
    setResult(null)
    
    const progressInterval = simulateProgress()

    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('📤 OCRテスト開始:', file.name)

      const response = await fetch('/api/test-ocr', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'アップロードに失敗しました')
      }

      setResult(data)
      console.log('✅ OCRテスト完了:', data)

    } catch (err: any) {
      console.error('❌ OCRテストエラー:', err)
      setError(err.message)
      clearInterval(progressInterval)
      setProgress(0)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">OCR機能テスト</h1>
        <p className="text-gray-600">
          Tesseract.js OCRを使用したPDF文字認識のテストページです。
          画像ベースのPDFファイルからテキストを抽出します。
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PDFファイルアップロード
          </CardTitle>
          <CardDescription>
            テストしたいPDFファイルを選択してください。OCR処理には時間がかかる場合があります。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="w-full p-2 border rounded-md"
              disabled={isProcessing}
            />
          </div>
          
          {file && (
            <div className="text-sm text-gray-600">
              選択されたファイル: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin" />
                OCR処理中...
              </div>
            ) : (
              'OCRテスト開始'
            )}
          </Button>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-gray-600">
                処理中... {Math.round(progress)}%
              </p>
              <p className="text-xs text-center text-gray-500">
                OCR処理は画像の複雑さにより時間が変動します
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              OCR処理結果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>ファイル名:</strong> {result.fileName}
              </div>
              <div>
                <strong>ファイルサイズ:</strong> {(result.fileSize / 1024).toFixed(1)} KB
              </div>
              <div>
                <strong>抽出文字数:</strong> {result.textLength.toLocaleString()} 文字
              </div>
              <div>
                <strong>処理時間:</strong> {result.processingTimeSec} 秒
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">抽出されたテキスト（プレビュー）:</h3>
              <div className="bg-gray-50 p-4 rounded-md border max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">
                  {result.textPreview}
                </pre>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              処理日時: {new Date(result.extractedAt).toLocaleString('ja-JP')}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>OCR機能について</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <div>• <strong>Tesseract.js:</strong> 完全無料のJavaScript OCRライブラリ</div>
          <div>• <strong>対応言語:</strong> 日本語 + 英語の同時認識</div>
          <div>• <strong>処理時間:</strong> PDFページ数と画像複雑度により変動（通常1-3分/ページ）</div>
          <div>• <strong>最適化:</strong> 高解像度（2倍スケール）で画像化してOCR精度向上</div>
          <div>• <strong>フォールバック:</strong> 通常テキスト抽出失敗時に自動でOCR処理</div>
        </CardContent>
      </Card>
    </div>
  )
}
