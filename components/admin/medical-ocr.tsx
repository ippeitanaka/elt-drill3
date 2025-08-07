import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, CheckCircle, FileText, Upload } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Category {
  id: number
  name: string
}

interface MedicalOCRProps {
  categories: Category[]
}

interface ProcessingResult {
  success: boolean
  data?: {
    totalExtracted: number
    totalSaved: number
    categoryId: string
    questionSetId: number
    questions: Array<{
      number: number
      text: string
      choicesCount: number
      hasCorrectAnswer: boolean
    }>
  }
  extractedText?: string
  textLength?: number
  message?: string
  error?: string
  recommendations?: string[]
}

export default function MedicalOCRComponent({ categories }: MedicalOCRProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [autoDetectCategory, setAutoDetectCategory] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setResult(null)
    } else {
      alert('PDFファイルを選択してください')
    }
  }

  const processPDF = async () => {
    if (!selectedFile) {
      alert('PDFファイルを選択してください')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResult(null)

    try {
      // プログレス更新のシミュレーション
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const formData = new FormData()
      formData.append('pdfFile', selectedFile)
      if (selectedCategory && !autoDetectCategory) {
        formData.append('categoryId', selectedCategory)
      }
      formData.append('autoDetectCategory', autoDetectCategory.toString())

      console.log('🚀 医療問題OCR処理開始...')
      
      const response = await fetch('/api/process-medical-pdf', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data: ProcessingResult = await response.json()
      setResult(data)

      if (data.success) {
        console.log('✅ 医療問題OCR処理完了:', data)
      } else {
        console.error('❌ 医療問題OCR処理失敗:', data.error)
      }

    } catch (error: any) {
      console.error('❌ 医療問題OCR処理例外:', error)
      setResult({
        success: false,
        error: error.message || '処理中にエラーが発生しました'
      })
      setProgress(100)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          医療問題OCR抽出システム
        </CardTitle>
        <CardDescription>
          PDFファイルから医療系問題を自動抽出してデータベースに保存します
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* ファイル選択 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">PDFファイル選択</label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <span className="text-sm text-gray-600">
                {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
              </span>
            )}
          </div>
        </div>

        {/* カテゴリー設定 */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoDetect"
              checked={autoDetectCategory}
              onCheckedChange={(checked) => setAutoDetectCategory(checked as boolean)}
              disabled={isProcessing}
            />
            <label htmlFor="autoDetect" className="text-sm font-medium">
              カテゴリーを自動判定する（推奨）
            </label>
          </div>
          
          {!autoDetectCategory && (
            <div className="space-y-2">
              <label className="text-sm font-medium">手動カテゴリー選択</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isProcessing}>
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリーを選択..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 処理実行ボタン */}
        <Button
          onClick={processPDF}
          disabled={!selectedFile || isProcessing}
          className="w-full"
          size="lg"
        >
          <Upload className="w-4 h-4 mr-2" />
          {isProcessing ? '医療問題を抽出中...' : '医療問題を抽出'}
        </Button>

        {/* プログレスバー */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-gray-600">
              PDFを解析中... {progress}%
            </p>
          </div>
        )}

        {/* 結果表示 */}
        {result && (
          <div className="space-y-4">
            {result.success ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold text-green-700">{result.message}</p>
                    {result.data && (
                      <div className="text-sm space-y-1">
                        <p>• 抽出された問題数: {result.data.totalExtracted}問</p>
                        <p>• 保存された問題数: {result.data.totalSaved}問</p>
                        <p>• 問題セットID: {result.data.questionSetId}</p>
                        <p>• カテゴリーID: {result.data.categoryId}</p>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">エラー: {result.error}</p>
                    {result.recommendations && (
                      <div className="text-sm">
                        <p className="font-semibold">推奨対策:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {result.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 抽出されたテキストの表示（成功・失敗問わず） */}
            {result.extractedText && (
              <div className="space-y-2">
                <label className="text-sm font-medium">抽出されたテキスト（先頭1000文字）:</label>
                <textarea
                  className="w-full h-32 p-3 border rounded-md text-xs font-mono bg-gray-50"
                  value={result.extractedText}
                  readOnly
                />
                {result.textLength && (
                  <p className="text-xs text-gray-600">
                    全体のテキスト長: {result.textLength.toLocaleString()}文字
                  </p>
                )}
              </div>
            )}

            {/* 抽出された問題の詳細（成功時のみ） */}
            {result.success && result.data?.questions && (
              <div className="space-y-2">
                <label className="text-sm font-medium">抽出された問題一覧:</label>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  {result.data.questions.map((question, index) => (
                    <div key={index} className="p-3 border-b last:border-b-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm">問題 {question.number}</span>
                        <div className="flex gap-2 text-xs">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            選択肢: {question.choicesCount}個
                          </span>
                          {question.hasCorrectAnswer && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                              正解あり
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{question.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
