"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { parseMedicalQuestions, parseAnswerPDF, combineQuestionsAndAnswers } from '@/lib/medical-question-parser'

interface ClientSideOCRProps {
  // 互換性維持のため props は残すが未使用
  categories?: Array<{ id: number; name: string }>
  onProcessingComplete?: (result: any) => void
}

export default function ClientSideOCR({ onProcessingComplete }: ClientSideOCRProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedAnswerFile, setSelectedAnswerFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [parsedCount, setParsedCount] = useState(0)
  const [matchedCount, setMatchedCount] = useState(0)
  const [answersFound, setAnswersFound] = useState(0)
  const [error, setError] = useState('')
  // 追加: カテゴリーと保存関連
  const [categories, setCategories] = useState<Array<{ id: string | number; name: string }>>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveDraft, setSaveDraft] = useState<any[] | null>(null)

  // 追加: APIバージョン/環境チェック用の状態
  const [apiVersion, setApiVersion] = useState<string | null>(null)
  const [apiHealthy, setApiHealthy] = useState(false)
  const [envWarning, setEnvWarning] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const answerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    console.log('ClientSideOCR: 初期化')
    // カテゴリー読み込み（サーバー側キー使用のAPI経由）
    ;(async () => {
      try {
        const res = await fetch('/api/quiz-categories', { cache: 'no-store' })
        const json = await res.json()
        if (res.ok && json?.success) {
          const items = (json.data?.categories || []).map((c: any) => ({ id: c.id, name: c.name }))
          setCategories(items)
        } else {
          console.warn('カテゴリー取得APIエラー:', json?.error || res.statusText)
        }
      } catch (e) {
        console.warn('カテゴリー取得に失敗しました', e)
      }

      // APIバージョン確認とデプロイ判定
      try {
        const verRes = await fetch('/api/save-questions', { method: 'GET', cache: 'no-store' })
        if (verRes.ok) {
          const v = await verRes.json()
          const ver = v?.version || null
          setApiVersion(ver)
          const ok = ver === 'v3-minimal-insert'
          setApiHealthy(!!ok)
          if (!ok) {
            setEnvWarning('この環境は古いAPIです。最新の本番URLでお試しください。')
          }
        } else {
          setApiHealthy(false)
          setEnvWarning('この環境では保存APIの検証に失敗しました。最新の本番URLでお試しください。')
        }
      } catch (e) {
        setApiHealthy(false)
        setEnvWarning('ネットワークに問題があるか古いデプロイです。最新の本番URLでお試しください。')
      }

      // カノニカルURLと現在のホストを比較（設定がある場合）
      const canonical = process.env.NEXT_PUBLIC_CANONICAL_URL as string | undefined
      if (typeof window !== 'undefined' && canonical) {
        try {
          const u = new URL(canonical)
          if (window.location.host !== u.host) {
            setEnvWarning(prev => prev || `古いデプロイを開いています。最新: ${canonical}`)
          }
        } catch {
          // 無視
        }
      }
    })()
  }, [])

  // 正解表記を a-e に正規化
  const normalizeToLetter = (val?: string) => {
    if (!val) return undefined
    const s = String(val).trim()
    const mapDigit: Record<string, string> = { '1': 'a', '2': 'b', '3': 'c', '4': 'd', '5': 'e' }
    const fullToHalf: Record<string, string> = { '１': '1', '２': '2', '３': '3', '４': '4', '５': '5' }
    const circleToDigit: Record<string, string> = { '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5' }
    const kanaToLetter: Record<string, string> = { 'ア': 'a', 'イ': 'b', 'ウ': 'c', 'エ': 'd', 'オ': 'e' }
    const upperToLower: Record<string, string> = { 'A': 'a', 'B': 'b', 'C': 'c', 'D': 'd', 'E': 'e' }
    const half = fullToHalf[s] || s
    const digit = circleToDigit[half] || half
    if (mapDigit[digit]) return mapDigit[digit]
    if (upperToLower[digit]) return upperToLower[digit]
    if (kanaToLetter[digit]) return kanaToLetter[digit]
    return ['a','b','c','d','e'].includes(digit) ? digit : undefined
  }

  // choices レコードを a-e 配列に変換（表記ゆれ・配列にも対応）
  const toChoicesArray = (choices: any) => {
    const out = ['', '', '', '', '']
    if (!choices) return out

    // 全角→半角（英数字）
    const zenkakuToHankaku = (s: string) => s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    )

    const kanaToLetter: Record<string, string> = { 'ア': 'a', 'イ': 'b', 'ウ': 'c', 'エ': 'd', 'オ': 'e' }
    const circleToDigit: Record<string, string> = { '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5' }

    const normalizeKey = (raw: string) => {
      let s = String(raw || '').trim()
      // かっこ等の前後記号を削除
      s = s.replace(/^[\(（［【<〈「『\[]+\s*/g, '')
           .replace(/\s*[\)）］】>〉」』\]．。\.、:：]+$/g, '')
      s = zenkakuToHankaku(s).toLowerCase()
      // circled digits を半角数字へ
      s = s.split('').map(ch => circleToDigit[ch] || ch).join('')
      // option_/choice_ 前置詞を除去
      s = s.replace(/^(option_|choice_|opt_|ans_|answer_)/, '')
      // カナ → 英字
      if (kanaToLetter[s as keyof typeof kanaToLetter]) return kanaToLetter[s as keyof typeof kanaToLetter]
      return s
    }

    const put = (idx: number, val: any) => {
      const v = (val ?? '').toString().trim()
      if (!v) return
      if (idx >= 0 && idx < 5 && !out[idx]) out[idx] = v
    }

    // 配列として来た場合（index 0-4）
    if (Array.isArray(choices)) {
      for (let i = 0; i < Math.min(5, choices.length); i++) put(i, choices[i])
      return out
    }

    // オブジェクトとして来た場合
    const entries = Object.entries(choices || {})
    for (const [rawK, v] of entries) {
      const k = normalizeKey(rawK)
      // a-e
      if (k === 'a') { put(0, v); continue }
      if (k === 'b') { put(1, v); continue }
      if (k === 'c') { put(2, v); continue }
      if (k === 'd') { put(3, v); continue }
      if (k === 'e') { put(4, v); continue }
      // 0-4（配列風）
      if (/^[0-4]$/.test(k)) { put(parseInt(k, 10), v); continue }
      // 1-5（人間の番号）
      if (/^[1-5]$/.test(k)) { put(parseInt(k, 10) - 1, v); continue }
    }

    // なお空きがあり、値が存在する場合は順次詰めるフォールバック
    if (out.filter(Boolean).length === 0) {
      let i = 0
      for (const v of Object.values(choices)) {
        if (i >= 5) break
        put(i, v)
        i++
      }
    }

    return out
  }

  const processWithOCR = async () => {
    if (!selectedFile) {
      setError('問題PDFを選択してください')
      return
    }

    setProcessing(true)
    setProgress(0)
    setError('')
    setExtractedText('')
    setParsedCount(0)
    setMatchedCount(0)
    setAnswersFound(0)
    setSaveDraft(null)

    try {
      setStage('OCRライブラリを読み込み中...')
      setProgress(5)

      const Tesseract = await import('tesseract.js')

      setStage('OCRワーカーを初期化中...')
      setProgress(10)

      const worker: any = await (Tesseract as any).createWorker('jpn', {
        workerPath: '/tesseract-worker.min.js',
        corePath: '/tesseract-core.wasm.js',
        langPath: '/'
      })

      // 1) 問題PDF
      setStage('問題PDFを解析中...')
      setProgress(15)
      const questionText = await extractTextSmart(worker, selectedFile)
      setExtractedText(questionText)

      // 2) 解答PDF（任意）
      let answerText = ''
      if (selectedAnswerFile) {
        setStage('解答PDFを解析中...')
        setProgress(85)
        answerText = await extractTextSmart(worker, selectedAnswerFile)
        setProgress(95)
      }

      setStage('OCRワーカーを終了中...')
      await worker.terminate()

      // 3) ローカル解析
      setStage('テキストをローカル解析中...')
      const questionSet = parseMedicalQuestions(questionText)
      setParsedCount(questionSet.totalQuestions)

      if (selectedAnswerFile) {
        const answerSet = parseAnswerPDF(answerText)
        setAnswersFound(answerSet.totalAnswers)
        const combined = combineQuestionsAndAnswers(questionSet, answerSet)
        setParsedCount(combined.totalQuestions)
        const matched = combined.questions.filter(q => !!q.correctAnswer).length
        setMatchedCount(matched)
        // 保存用下書き作成
        const draft = combined.questions.map(q => {
          const base: any = {
            question_text: q.questionText,
            choices: toChoicesArray(q.choices)
          }
          const normalized = normalizeToLetter(q.correctAnswer)
          if (normalized) base.correct_answer = normalized
          return base
        })
        setSaveDraft(draft)

        onProcessingComplete?.({
          success: true,
          questionsFound: combined.totalQuestions,
          matched,
          answersFound: answerSet.totalAnswers,
          extractedQuestions: combined.questions.slice(0, 3).map(q => ({
            question: q.questionText.substring(0, 100) + (q.questionText.length > 100 ? '...' : ''),
            optionCount: Object.keys(q.choices).length,
            correctAnswer: q.correctAnswer || undefined
          }))
        })
      } else {
        // 解答なしの場合も保存用下書きを用意（正解は未設定）
        const draft = questionSet.questions.map(q => ({
          question_text: q.questionText,
          choices: toChoicesArray(q.choices)
        }))
        setSaveDraft(draft)

        onProcessingComplete?.({
          success: true,
          questionsFound: questionSet.totalQuestions,
          extractedQuestions: questionSet.questions.slice(0, 3).map(q => ({
            question: q.questionText.substring(0, 100) + (q.questionText.length > 100 ? '...' : ''),
            optionCount: Object.keys(q.choices).length
          }))
        })
      }

      setProgress(100)
      setStage('処理完了！')
    } catch (err) {
      console.error('OCR処理エラー:', err)
      setError(`OCR処理でエラーが発生しました: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setProcessing(false)
    }
  }

  // PDFにテキストが埋め込まれていれば直接抽出、なければOCR（全ページ対象）
  const extractTextSmart = async (worker: any, file: File): Promise<string> => {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
    GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await getDocument({ data: arrayBuffer }).promise

    let fullText = ''

    // 上限を撤廃して全ページ処理
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      setStage(`ページ ${pageNum}/${pdf.numPages} を処理中...`)
      const page = await pdf.getPage(pageNum)

      // 1) テキストレイヤーから直接抽出
      try {
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((it: any) => (it.str || '')).join(' ').replace(/\s+/g, ' ').trim()
        const hasJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(pageText)
        if (pageText.length > 50 && hasJapanese) {
          fullText += `--- ページ ${pageNum} ---\n${pageText}\n\n`
          continue // OCR不要
        }
      } catch (e) {
        // テキスト抽出失敗時はOCRにフォールバック
      }

      // 2) OCRフォールバック
      const ocrText = await recognizePageWithOCR(worker, page, pageNum)
      if (ocrText) {
        fullText += `--- ページ ${pageNum} ---\n${ocrText}\n\n`
      }
    }

    return fullText
  }

  // 単一ページをCanvasに描画してOCR
  const recognizePageWithOCR = async (worker: any, page: any, pageNum: number): Promise<string> => {
    const scales = [2.0, 2.5, 3.0]
    const thresholds = [120, 145, 170]
    let bestText = ''
    let maxLen = 0

    const totalSteps = scales.length * thresholds.length
    let step = 0

    for (const scale of scales) {
      setStage(`ページ ${pageNum} をOCR中 (x${scale})...`)
      try {
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = viewport.width
        canvas.height = viewport.height
        ctx.imageSmoothingEnabled = false

        await page.render({ canvasContext: ctx, viewport, intent: 'print' as any }).promise

        for (const threshold of thresholds) {
          step += 1
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = img.data
          for (let i = 0; i < data.length; i += 4) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
            const v = lum > threshold ? 255 : 0
            data[i] = v; data[i + 1] = v; data[i + 2] = v
          }
          ctx.putImageData(img, 0, 0)

          const { data: { text } } = await worker.recognize(canvas)
          const t = (text || '').trim()
          if (t.length > maxLen) { maxLen = t.length; bestText = t }

          // ページ内進捗（25→85%の間で進める）
          const pageProgressStart = 25
          const pageProgressEnd = 85
          const frac = step / totalSteps
          const value = Math.floor(pageProgressStart + (pageProgressEnd - pageProgressStart) * frac)
          setProgress(value)
        }
      } catch (e) { console.warn(`ページ${pageNum} x${scale} OCR失敗`, e) }
    }

    return bestText
  }

  const handleSave = async () => {
    if (!saveDraft || saveDraft.length === 0) {
      setError('保存するデータがありません。先にOCR解析を実行してください。')
      return
    }
    if (!selectedCategoryId) {
      setError('カテゴリーを選択してください')
      return
    }

    // 最終バージョンチェック（古いデプロイでの保存を防止）
    if (!apiHealthy) {
      try {
        const check = await fetch('/api/save-questions', { method: 'GET', cache: 'no-store' })
        const j = check.ok ? await check.json() : null
        if (!(j?.version === 'v3-minimal-insert')) {
          const canonical = process.env.NEXT_PUBLIC_CANONICAL_URL as string | undefined
          setError('古いデプロイのため保存を停止しました。最新の本番URLで実行してください。' + (canonical ? ` 最新: ${canonical}` : ''))
          return
        } else {
          setApiHealthy(true)
          setApiVersion(j.version || null)
        }
      } catch (e) {
        setError('保存APIの確認に失敗しました。最新の本番URLで実行してください。')
        return
      }
    }

    // カテゴリーIDは数値・UUIDの両対応
    const catId = /^\d+$/.test(String(selectedCategoryId)) ? Number(selectedCategoryId) : selectedCategoryId

    try {
      setSaving(true)
      setStage('データベースに保存中...')
      const res = await fetch('/api/save-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: catId,
          questions: saveDraft
        })
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }
      setStage('保存完了！')
    } catch (e: any) {
      console.error('保存エラー:', e)
      setError(`保存に失敗しました: ${e?.message || e}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">🧠 クライアントサイドOCR処理（サーバー不要）</CardTitle>
        <CardDescription>
          問題PDFと解答PDFを同時に解析し、番号で結合します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 環境警告表示 */}
        {envWarning && (
          <Alert variant="destructive">
            <AlertDescription>
              {envWarning}{process.env.NEXT_PUBLIC_CANONICAL_URL ? (
                <> (<a className="underline" href={process.env.NEXT_PUBLIC_CANONICAL_URL} target="_blank" rel="noreferrer">最新のURLを開く</a>)</>
              ) : null}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">問題PDFファイル</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full p-2 border rounded-md"
              disabled={processing}
              aria-label="問題PDFファイル"
              title="問題PDFを選択"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">解答PDFファイル（任意）</label>
            <input
              ref={answerInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => setSelectedAnswerFile(e.target.files?.[0] || null)}
              className="w-full p-2 border rounded-md"
              disabled={processing}
              aria-label="解答PDFファイル"
              title="解答PDFを選択（任意）"
            />
            <p className="text-xs text-gray-500 mt-1">選択すると正解番号を自動結合します（番号一致）。</p>
          </div>
        </div>

        <Button 
          onClick={processWithOCR}
          disabled={!selectedFile || processing}
          className="w-full"
        >
          {processing ? 'OCR処理中...' : 'OCR処理を開始'}
        </Button>

        {/* カテゴリー選択と保存 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">保存先カテゴリー</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full p-2 border rounded-md"
            disabled={processing || saving}
            aria-label="保存先カテゴリーを選択"
          >
            <option value="">-- カテゴリーを選択 --</option>
            {categories.map(c => (
              <option key={String(c.id)} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
          <Button
            onClick={handleSave}
            disabled={saving || processing || !saveDraft || !selectedCategoryId || !apiHealthy}
            className="w-full"
          >
            {saving ? '保存中...' : 'データベースに保存'}
          </Button>
          <p className="text-xs text-gray-500">APIバージョン: {apiVersion || '未確認'} / 解析後にカテゴリーを選んで保存すると、クイズで利用できるようになります。</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-md text-sm">
          <h3 className="font-medium text-blue-800 mb-2">📋 OCR精度向上のコツ</h3>
          <ul className="text-blue-700 space-y-1">
            <li>• テキスト埋め込みPDFはそのまま抽出するため極めて高精度です</li>
            <li>• スキャンPDFは高解像度(300dpi相当)が最適です</li>
            <li>• 文字と背景のコントラストが高いものを推奨します</li>
            <li>• 全ページ（上限なし）を対象にしています</li>
          </ul>
        </div>

        {processing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-600 text-center">{stage}</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {extractedText && !processing && (
          <div className="space-y-3">
            <label className="block text-sm font-medium">抽出テキスト（問題PDF 先頭プレビュー）</label>
            <textarea
              value={extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')}
              readOnly
              className="w-full h-32 p-2 border rounded-md text-xs font-mono bg-gray-50"
              aria-label="抽出テキストプレビュー"
              title="抽出テキストプレビュー"
              placeholder="抽出されたテキストの先頭を表示します"
            />
            <div className="text-sm">
              <p className="text-xs text-gray-500">{extractedText.length} 文字のテキストを抽出しました</p>
              <p className="font-medium">問題検出: {parsedCount} 問{selectedAnswerFile ? `（正解抽出: ${answersFound} 件、結合: ${matchedCount} 問）` : ''}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
