import * as pdfjsLib from 'pdfjs-dist'
import Tesseract from 'tesseract.js'

// PDF.js worker を設定
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'
}

export interface OCRResult {
  text: string
  confidence: number
  pageNumber: number
}

export interface AdvancedOCROptions {
  language?: string
  psm?: number // Page Segmentation Mode
  tesseractOptions?: Record<string, any>
  imageQuality?: number
  preprocessImage?: boolean
}

/**
 * 高度なOCR処理クラス
 * 画像ベースのPDFやテキスト抽出が困難なPDFに対応
 */
export class AdvancedOCRProcessor {
  private defaultOptions: AdvancedOCROptions = {
    language: 'jpn+eng',
    psm: 6, // Uniform block of text
    imageQuality: 2.0, // 高解像度でレンダリング
    preprocessImage: true,
    tesseractOptions: {
      preserve_interword_spaces: '1',
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポッャュョァィゥェォー？。、・（）「」【】〔〕〈〉《》『』{}[]()<>.,;:!?-_=+*/%#$@&^~`|\\\'\"　'
    }
  }

  /**
   * PDFファイルから高品質なテキストを抽出
   */
  async extractTextFromPDF(
    pdfBuffer: Buffer | Uint8Array,
    options: AdvancedOCROptions = {}
  ): Promise<{ text: string; pages: OCRResult[]; totalConfidence: number }> {
    const mergedOptions = { ...this.defaultOptions, ...options }
    
    try {
      // Step 1: 基本的なテキスト抽出を試行
      const basicText = await this.tryBasicTextExtraction(pdfBuffer)
      if (basicText && basicText.length > 100) {
        console.log('✅ 基本テキスト抽出成功')
        return {
          text: basicText,
          pages: [{ text: basicText, confidence: 1.0, pageNumber: 1 }],
          totalConfidence: 1.0
        }
      }

      console.log('⚠️ 基本テキスト抽出失敗、OCR処理開始...')

      // Step 2: OCR処理
      const doc = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
      const pages: OCRResult[] = []
      let totalText = ''
      let totalConfidence = 0

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        console.log(`📄 ページ ${pageNum}/${doc.numPages} を処理中...`)
        
        const page = await doc.getPage(pageNum)
        const canvas = this.createCanvas()
        const canvasContext = canvas.getContext('2d')!
        
        // 高解像度でレンダリング
        const viewport = page.getViewport({ scale: mergedOptions.imageQuality! })
        canvas.width = viewport.width
        canvas.height = viewport.height
        
        const renderContext = {
          canvasContext,
          viewport
        }
        
        await page.render(renderContext).promise
        
        // 画像前処理（オプション）
        if (mergedOptions.preprocessImage) {
          this.preprocessCanvasImage(canvas, canvasContext)
        }
        
        // OCR実行
        const imageData = canvas.toDataURL('image/png')
        const ocrResult = await this.performOCR(imageData, mergedOptions)
        
        if (ocrResult.text.trim()) {
          pages.push({
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            pageNumber: pageNum
          })
          totalText += `\n=== ページ ${pageNum} ===\n${ocrResult.text}\n`
          totalConfidence += ocrResult.confidence
        }
      }

      const averageConfidence = pages.length > 0 ? totalConfidence / pages.length : 0
      
      return {
        text: totalText.trim(),
        pages,
        totalConfidence: averageConfidence
      }

    } catch (error) {
      console.error('❌ OCR処理エラー:', error)
      throw new Error(`OCR処理に失敗しました: ${error}`)
    }
  }

  /**
   * 基本的なテキスト抽出を試行
   */
  private async tryBasicTextExtraction(pdfBuffer: Buffer | Uint8Array): Promise<string> {
    try {
      const doc = await pdfjsLib.getDocument({ data: pdfBuffer }).promise
      let fullText = ''

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim()
        
        if (pageText && pageText.length > 10) {
          fullText += `\n=== ページ ${pageNum} ===\n${pageText}\n`
        }
      }

      return fullText.trim()
    } catch (error) {
      console.log('基本テキスト抽出失敗:', error)
      return ''
    }
  }

  /**
   * Canvasを作成（ブラウザ・Node.js両対応）
   */
  private createCanvas(): HTMLCanvasElement {
    if (typeof window !== 'undefined') {
      // ブラウザ環境
      return document.createElement('canvas')
    } else {
      // Node.js環境（サーバーサイド）
      const { createCanvas } = require('canvas')
      return createCanvas(800, 600)
    }
  }

  /**
   * 画像前処理（コントラスト強化など）
   */
  private preprocessCanvasImage(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      // コントラスト強化とノイズ除去
      for (let i = 0; i < data.length; i += 4) {
        // グレースケール変換
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
        
        // コントラスト強化
        const contrast = 1.5
        const enhanced = ((gray - 128) * contrast) + 128
        
        // 二値化（オプション）
        const threshold = 128
        const binary = enhanced > threshold ? 255 : 0
        
        data[i] = binary     // R
        data[i + 1] = binary // G
        data[i + 2] = binary // B
        // data[i + 3] はAlpha値（そのまま）
      }

      context.putImageData(imageData, 0, 0)
    } catch (error) {
      console.warn('画像前処理でエラー:', error)
      // エラーの場合は前処理をスキップ
    }
  }

  /**
   * Tesseract.jsでOCR実行
   */
  private async performOCR(
    imageData: string,
    options: AdvancedOCROptions
  ): Promise<{ text: string; confidence: number }> {
    try {
      const { data } = await Tesseract.recognize(
        imageData,
        options.language!,
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR進行中: ${Math.round(m.progress * 100)}%`)
            }
          }
        }
      )

      return {
        text: data.text,
        confidence: data.confidence
      }
    } catch (error) {
      console.error('Tesseract OCRエラー:', error)
      return { text: '', confidence: 0 }
    }
  }

  /**
   * 抽出されたテキストの品質評価
   */
  evaluateTextQuality(text: string): {
    score: number
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    let score = 100

    // 長さチェック
    if (text.length < 100) {
      score -= 30
      issues.push('テキストが短すぎます')
      recommendations.push('画像解像度を上げてOCRを再実行してください')
    }

    // 日本語文字チェック
    const japaneseChars = (text.match(/[ひらがなカタカナ漢字]/g) || []).length
    const totalChars = text.replace(/\s/g, '').length
    const japaneseRatio = totalChars > 0 ? japaneseChars / totalChars : 0

    if (japaneseRatio < 0.3) {
      score -= 20
      issues.push('日本語文字の割合が低い')
      recommendations.push('日本語OCRの精度を向上させてください')
    }

    // 問題らしい文章のチェック
    const questionKeywords = ['問題', '問', '次の', '以下の', '正しい', '適切', '選択']
    const hasQuestionKeywords = questionKeywords.some(keyword => text.includes(keyword))
    
    if (!hasQuestionKeywords) {
      score -= 25
      issues.push('問題らしいキーワードが検出されません')
      recommendations.push('問題文が含まれているか確認してください')
    }

    // 選択肢らしいパターンのチェック
    const choicePatterns = [/[1-5]\./g, /[ア-オ]\./g, /[a-e]\./g, /\([1-5]\)/g]
    const hasChoices = choicePatterns.some(pattern => pattern.test(text))
    
    if (!hasChoices) {
      score -= 25
      issues.push('選択肢パターンが検出されません')
      recommendations.push('選択肢が正しく抽出されているか確認してください')
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations
    }
  }
}

export const advancedOCR = new AdvancedOCRProcessor()
