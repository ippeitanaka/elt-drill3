export interface ServerOCROptions {
  language?: string
  dpi?: number
  preprocessImage?: boolean
}

export interface ServerOCRResult {
  text: string
  confidence: number
  pageResults: Array<{
    pageNumber: number
    text: string
    confidence: number
  }>
}

export class ServerOCR {
  /**
   * PDFファイルからテキストを抽出（サーバーサイド処理）
   */
  async extractTextFromPDF(
    pdfBuffer: Buffer, 
    options: ServerOCROptions = {}
  ): Promise<ServerOCRResult> {
    console.log('🔍 サーバーサイドPDF処理開始')
    
    try {
      // 動的インポートでpdf-parseを読み込み
      console.log('📦 pdf-parseライブラリを動的読み込み中...')
      const pdfParse = (await import('pdf-parse')).default
      
      // pdf-parseで直接テキスト抽出
      console.log('📄 PDF直接テキスト抽出実行...')
      const pdfData = await pdfParse(pdfBuffer)
      
      console.log(`✅ PDF抽出完了: ${pdfData.text.length}文字`)

      // 直接抽出の結果が少なすぎる（スキャンPDF等）場合はOCRフォールバック
      if ((pdfData.text || '').trim().length < 100) {
        console.log('⚠️ 直接抽出テキストが少ないため、OCRフォールバックを実行します...')
        const ocrFallback = await this.ocrWithTesseract(pdfBuffer, options.language || 'jpn+eng')
        return ocrFallback
      }
      
      return {
        text: pdfData.text,
        confidence: 0.9, // PDF直接抽出は高信頼度
        pageResults: [{
          pageNumber: 1,
          text: pdfData.text,
          confidence: 0.9
        }]
      }

    } catch (error) {
      console.error('❌ サーバーサイドPDF処理エラー:', error)
      
      // pdf-parseが利用できない/失敗した場合はOCRフォールバック
      console.log('🔄 OCRフォールバックを試行します...')
      const ocrFallback = await this.ocrWithTesseract(pdfBuffer, options.language || 'jpn+eng')
      return ocrFallback
    }
  }

  /**
   * Tesseract.js によるOCRフォールバック
   */
  private async ocrWithTesseract(pdfBuffer: Buffer, language: string): Promise<ServerOCRResult> {
    console.log('🤖 Tesseract.js OCRフォールバック開始...')

    // pdfjs-dist を使用して PDF をページ画像にレンダリング
    const pdfjs = await import('pdfjs-dist')
    // Node 環境ではワーカーを使用しない
    ;(pdfjs as any).GlobalWorkerOptions.workerSrc = ''

    const loadingTask = (pdfjs as any).getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      stopAtErrors: false,
      useWorkerFetch: false,
      isEvalSupported: false
    })

    const pdf = await loadingTask.promise
    console.log(`📄 OCR対象ページ数: ${pdf.numPages}`)

    const { createCanvas } = await import('canvas')
    const Tesseract = await import('tesseract.js')

    let combinedText = ''
    const pageResults: ServerOCRResult['pageResults'] = []

    // パフォーマンスのため、最大5ページまで
    const maxPages = Math.min(pdf.numPages, 5)

    // Tesseract worker をページごとに作成/破棄（メモリ消費を抑える）
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale: 2.0 })
        const canvas = createCanvas(viewport.width, viewport.height)
        const context = canvas.getContext('2d') as any

        await page.render({ canvasContext: context, viewport }).promise

        const dataUrl = canvas.toDataURL('image/png')
        
        const worker: any = await (Tesseract as any).default.createWorker(language, {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              console.log(`📊 ページ${pageNum} OCR進捗: ${Math.round((m.progress || 0) * 100)}%`)
            }
          }
        })

        const result = await worker.recognize(dataUrl)
        const text = (result?.data?.text || '').trim()
        await worker.terminate()

        combinedText += `\n=== ページ ${pageNum} (OCR) ===\n${text}\n`
        pageResults.push({ pageNumber: pageNum, text, confidence: 0.6 })
        console.log(`✅ ページ${pageNum} OCR完了: ${text.length}文字`)
      } catch (pageErr) {
        console.error(`❌ ページ${pageNum} OCRエラー:`, pageErr)
      }
    }

    if (combinedText.trim().length === 0) {
      throw new Error('OCRフォールバックでもテキストを抽出できませんでした')
    }

    return {
      text: combinedText.trim(),
      confidence: 0.6,
      pageResults
    }
  }

  /**
   * テキスト品質評価
   */
  evaluateTextQuality(text: string): {
    score: number
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    let score = 100

    // 基本的な品質チェック
    if (text.length < 50) {
      score -= 30
      issues.push('抽出テキストが短すぎます')
      recommendations.push('PDF品質を確認してください')
    }

    // 日本語文字の存在確認
    const hasJapanese = /[\u3040-\u30ff\u4e00-\u9faf]/.test(text)
    if (!hasJapanese) {
      score -= 20
      issues.push('日本語文字が検出されません')
      recommendations.push('言語設定を確認してください')
    }

    // 問題パターンの存在確認
    const hasQuestionPattern = /問\d+|Q\d+|\d+[．.]/g.test(text)
    if (!hasQuestionPattern) {
      score -= 25
      issues.push('問題番号パターンが見つかりません')
      recommendations.push('問題形式のPDFかどうか確認してください')
    }

    // 選択肢パターンの存在確認
    const hasChoicePattern = /[1-5][．.]|[a-e][．.]|[ア-オ][．.]/g.test(text)
    if (!hasChoicePattern) {
      score -= 25
      issues.push('選択肢パターンが見つかりません')
      recommendations.push('選択肢形式を確認してください')
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations
    }
  }
}

// シングルトンインスタンス
export const serverOCR = new ServerOCR()
