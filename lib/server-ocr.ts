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
      
      // pdf-parseが利用できない場合のフォールバック
      if (error instanceof Error && error.message.includes('pdf-parse')) {
        console.log('⚠️ pdf-parseが利用できません。基本的なBuffer解析を試行...')
        
        // 基本的なPDFヘッダー確認
        const pdfHeader = pdfBuffer.slice(0, 5).toString()
        if (pdfHeader === '%PDF-') {
          return {
            text: 'PDFファイルが確認されましたが、テキスト抽出ライブラリが利用できません。',
            confidence: 0.1,
            pageResults: [{
              pageNumber: 1,
              text: 'PDFファイルが確認されましたが、テキスト抽出ライブラリが利用できません。',
              confidence: 0.1
            }]
          }
        }
      }
      
      throw new Error(`PDF処理に失敗しました: ${error instanceof Error ? error.message : String(error)}`)
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
    const hasJapanese = /[ひらがなカタカナ漢字]/.test(text)
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
