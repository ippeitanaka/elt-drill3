'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Category {
  id: number
  name: string
}

interface ClientSideOCRProps {
  categories: Category[]
  onProcessingComplete: (result: any) => void
}

export default function ClientSideOCR({ categories, onProcessingComplete }: ClientSideOCRProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // OCR処理の実行
  const processWithOCR = async () => {
    if (!selectedFile || !selectedCategory) {
      setError('ファイルとカテゴリーを選択してください')
      return
    }

    setProcessing(true)
    setProgress(0)
    setError('')
    setExtractedText('')

    try {
      // Tesseract.jsの動的インポート
      setStage('OCRライブラリを読み込み中...')
      setProgress(10)
      
      const { createWorker } = await import('tesseract.js')
      
      setStage('OCRワーカーを初期化中...')
      setProgress(20)
      
      const worker = await createWorker('jpn', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progressValue = Math.floor(m.progress * 60) + 20 // 20-80%の範囲
            setProgress(progressValue)
            setStage(`テキスト認識中... ${Math.floor(m.progress * 100)}%`)
          }
        }
      })

      setStage('PDFを画像に変換中...')
      setProgress(15)

      // PDFを画像に変換してOCR処理
      const text = await performOCROnPDF(worker, selectedFile)
      
      setProgress(85)
      setStage('OCRワーカーを終了中...')
      
      await worker.terminate()
      
      setProgress(90)
      setStage('テキストを解析中...')
      
      setExtractedText(text)

      // サーバーにテキストを送信して問題抽出
      await sendTextForProcessing(text)
      
      setProgress(100)
      setStage('処理完了！')
      
    } catch (err) {
      console.error('OCR処理エラー:', err)
      setError(`OCR処理でエラーが発生しました: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setProcessing(false)
    }
  }

  // PDFからOCRでテキスト抽出
  const performOCROnPDF = async (worker: any, file: File): Promise<string> => {
    // PDF.jsを使用してPDFを画像に変換
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
    
    // PDF.js workerの設定
    GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) { // 最大10ページまで
      setStage(`ページ ${pageNum}/${Math.min(pdf.numPages, 10)} を処理中...`)
      
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2.0 })
      
      // Canvasを作成
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      // PDFページをCanvasにレンダリング
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      }
      
      await page.render(renderContext).promise
      
      // CanvasからOCR実行
      const { data: { text } } = await worker.recognize(canvas)
      fullText += text + '\n\n'
    }
    
    return fullText
  }

  // 抽出されたテキストをサーバーに送信
  const sendTextForProcessing = async (text: string) => {
    setStage('問題を抽出中...')
    
    const response = await fetch('/api/process-extracted-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        extractedText: text,
        category: selectedCategory,
        fileName: selectedFile?.name
      })
    })

    if (!response.ok) {
      throw new Error(`サーバー処理エラー: ${response.status}`)
    }

    const result = await response.json()
    onProcessingComplete(result)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧠 クライアントサイドOCR処理
        </CardTitle>
        <CardDescription>
          ブラウザ内でOCR処理を実行し、サーバーレス環境の制限を回避します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ファイル選択 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">PDFファイル選択</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full p-2 border rounded-md"
              disabled={processing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">カテゴリー選択</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={processing}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリーを選択してください" />
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
        </div>

        {/* 処理ボタン */}
        <Button 
          onClick={processWithOCR}
          disabled={!selectedFile || !selectedCategory || processing}
          className="w-full"
        >
          {processing ? 'OCR処理中...' : 'OCR処理を開始'}
        </Button>

        {/* プログレスバー */}
        {processing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-600 text-center">{stage}</p>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 抽出されたテキストのプレビュー */}
        {extractedText && !processing && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">抽出されたテキスト（プレビュー）</label>
            <textarea
              value={extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')}
              readOnly
              className="w-full h-32 p-2 border rounded-md text-xs font-mono bg-gray-50"
            />
            <p className="text-xs text-gray-500">
              {extractedText.length} 文字のテキストが抽出されました
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
