'use client'

import React, { useState, useRef, useEffect } from 'react'
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

  // カテゴリーデータのデバッグ（1回だけ実行）
  useEffect(() => {
    console.log('ClientSideOCR: カテゴリーデータ初期化:', categories.length, '個')
  }, [categories.length])

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
      
      const { createWorker, PSM, OEM } = await import('tesseract.js')
      
      setStage('OCRワーカーを初期化中...')
      setProgress(20)
      
      const worker = await createWorker('jpn', OEM.LSTM_ONLY, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progressValue = Math.floor(m.progress * 60) + 20 // 20-80%の範囲
            setProgress(progressValue)
            setStage(`テキスト認識中... ${Math.floor(m.progress * 100)}%`)
          }
        }
      })

      // 日本語OCRに最適化されたパラメータ設定（警告を最小化）
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: '1',
        tessedit_char_blacklist: '',
        tessedit_char_whitelist: '',
        // 言語モデル関連のパラメータをクリア
        language_model_ngram_on: '0',
        language_model_use_sigmoidal_certainty: '0'
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
    
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 20); pageNum++) { // 最大20ページまで
      setStage(`ページ ${pageNum}/${Math.min(pdf.numPages, 20)} を処理中...`)
      
      const page = await pdf.getPage(pageNum)
      
      // 複数のスケールで試行し、最も文字数が多い結果を採用
      const scales = [2.5, 3.0, 3.5] // 異なる解像度で試行
      let bestText = ''
      let maxTextLength = 0
      
      for (const scale of scales) {
        try {
          const viewport = page.getViewport({ scale })
          
          // Canvasを作成
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')!
          canvas.height = viewport.height
          canvas.width = viewport.width
          
          // 高品質レンダリング設定
          context.imageSmoothingEnabled = false // シャープな文字のため無効化
          context.textRenderingOptimization = 'optimizeQuality'
          
          // PDFページをCanvasにレンダリング
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
            // 高品質レンダリングのための追加設定
            intent: 'print'
          }
          
          await page.render(renderContext).promise
      
            // 複数のスケールで試行し、最も文字数が多い結果を採用
      const scales = [2.5, 3.0, 3.5] // 異なる解像度で試行
      let bestText = ''
      let maxTextLength = 0
      
      for (const scale of scales) {
        try {
          const viewport = page.getViewport({ scale })
          
          // Canvasを作成
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')!
          canvas.height = viewport.height
          canvas.width = viewport.width
          
          // 高品質レンダリング設定
          context.imageSmoothingEnabled = false // シャープな文字のため無効化
          context.textRenderingOptimization = 'optimizeQuality'
          
          // PDFページをCanvasにレンダリング
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
            // 高品質レンダリングのための追加設定
            intent: 'print'
          }
          
          await page.render(renderContext).promise
          
          // 高度な画像前処理でOCR精度を向上
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          
          // 1. ガンマ補正とコントラスト強化
          for (let i = 0; i < data.length; i += 4) {
            // グレースケール化
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
            
            // ガンマ補正（0.7でより鮮明に）
            const gamma = 0.7
            const corrected = 255 * Math.pow(gray / 255, gamma)
            
            // 適応的二値化（閾値を動的に調整）
            const threshold = 160 // 日本語文字に最適化
            const binary = corrected > threshold ? 255 : 0
            
            data[i] = binary     // R
            data[i + 1] = binary // G  
            data[i + 2] = binary // B
            // data[i + 3] = alpha は変更しない
          }
          
          context.putImageData(imageData, 0, 0)
          
          // CanvasからOCR実行
          const { data: { text } } = await worker.recognize(canvas)
          
          // 最も長いテキストを保持（より多くの文字が認識されたものを採用）
          if (text.trim().length > maxTextLength) {
            maxTextLength = text.trim().length
            bestText = text.trim()
          }
          
        } catch (scaleError) {
          console.warn(`スケール ${scale} での処理でエラー:`, scaleError)
          // 次のスケールを試行
          continue
        }
      }
      
      if (bestText) {
        fullText += `--- ページ ${pageNum} ---\n${bestText}\n\n`
      }
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
            <label className="block text-sm font-medium mb-2">
              カテゴリー選択 ({categories.length}個利用可能)
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={processing}>
              <SelectTrigger>
                <SelectValue placeholder="カテゴリーを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-categories" disabled>
                    カテゴリーがありません
                  </SelectItem>
                )}
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

        {/* OCR改善のヒント */}
        <div className="bg-blue-50 p-4 rounded-md text-sm">
          <h3 className="font-medium text-blue-800 mb-2">📋 OCR精度向上のコツ</h3>
          <ul className="text-blue-700 space-y-1">
            <li>• 高解像度・高画質のPDFを使用してください</li>
            <li>• 文字が鮮明で背景とのコントラストが高いものが理想的です</li>
            <li>• 手書き文字ではなく印刷された文字を使用してください</li>
            <li>• ページ数が多い場合、20ページずつに分割することをお勧めします</li>
            <li>• スキャンされたPDFよりもテキストPDFの方が精度が高くなります</li>
          </ul>
        </div>

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
