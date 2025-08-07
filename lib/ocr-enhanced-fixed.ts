import Tesseract from 'tesseract.js'

export interface ExtractedQuestion {
  questionText: string
  choices: string[]
  correctAnswer?: number
  explanation?: string
  difficulty?: number
}

export interface ParsedQuizData {
  questions: ExtractedQuestion[]
  answers?: number[]
  metadata: {
    totalQuestions: number
    extractedAt: string
    source: string
  }
}

// 日本語・英語対応の正規表現パターン（改善版）
const QUESTION_PATTERNS = [
  // 「問題1.」「問題 1」「1.」形式
  /(?:問題?\s*\d+\s*[．.\)）:：]|第?\s*\d+\s*問[．.\)）:：]?)\s*(.+?)(?=(?:問題?\s*\d+\s*[．.\)）:：]|第?\s*\d+\s*問[．.\)）:：]?)|(?=\s*[1-5ア-オa-eA-E]\s*[．.\)）])|$)/gms,
  // 数字のみの問題番号
  /(?:^|\n)\s*(\d+)\s*[．.\)）:：]\s*(.+?)(?=(?:^|\n)\s*\d+\s*[．.\)）:：]|(?=\s*[1-5ア-オa-eA-E]\s*[．.\)）])|$)/gms,
  // 質問文パターン
  /(?:^|\n)\s*(.+?[？?])\s*(?=\s*[1-5ア-オa-eA-E]\s*[．.\)）]|$)/gm,
  // 「次の中から」「以下の中で」パターン
  /(?:次の中から|以下の中で|下記の中から|以下のうち)(.+?)(?:選択|選ん|答え|該当)/g,
  // 「について正しい」パターン
  /(.+?)(?:について|に関して|において)(?:正しい|適切な|最も|もっとも)(?:もの|答え|選択肢|記述)(?:を|は|が)/g,
  // 「どれか」パターン  
  /(.+?)(?:どれか|いずれか|どちらか)[．.?？]?\s*$/gm
]

const CHOICE_PATTERNS = [
  // 基本的な選択肢パターン
  /^\s*([1-5ア-オa-eA-E①-⑤])\s*[．.\)）]\s*(.+?)$/gm,
  // 括弧付き選択肢
  /^\s*\(([1-5ア-オa-eA-E①-⑤])\)\s*(.+?)$/gm,
  // コロン付き選択肢
  /^\s*([1-5ア-オa-eA-E①-⑤])\s*[:：]\s*(.+?)$/gm,
  // ハイフン・箇条書き
  /^\s*[・•-]\s*(.+?)$/gm,
  // 数字のみ
  /^\s*(\d+)\s*[．.\)）]\s*(.+?)$/gm
]

const ANSWER_PATTERNS = [
  // 「答え: 1」「解答: 1」形式
  /(?:答え|解答|正解)[:：]\s*([1-5ア-オa-eA-E①-⑤])/gi,
  // 「1番が正解」形式
  /([1-5ア-オa-eA-E①-⑤])\s*(?:番|が|は)?\s*(?:正解|正答|答え)/gi,
  // 「正解は1」形式
  /(?:正解|正答|答え)\s*(?:は|が)?\s*([1-5ア-オa-eA-E①-⑤])/gi
]

// PDFからテキストを抽出するメイン関数
export async function extractTextFromPDF(file: File): Promise<string> {
  console.log(`🔍 PDF解析開始: ${file.name} (${file.size} bytes)`)
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    console.log('📄 PDF.js による高精度抽出を試行...')
    
    // 方法1: PDF.js（pdfjs-dist）による抽出
    try {
      const text = await extractTextWithPDFJS(uint8Array)
      if (text && text.trim().length > 50) {
        console.log(`✅ PDF.js抽出成功: ${text.length}文字`)
        return text
      } else {
        throw new Error('PDF.jsで十分なテキストが抽出されませんでした')
      }
    } catch (pdfjsError: any) {
      console.warn('⚠️ PDF.js失敗:', pdfjsError.message)
      
      // 方法2: pdf-lib を試行  
      try {
        console.log('🔄 pdf-lib フォールバック開始...')
        const text = await extractTextWithPDFLib(uint8Array)
        
        if (text && text.trim().length > 0) {
          console.log(`✅ pdf-lib抽出完了: ${text.length}文字`)
          return text
        } else {
          throw new Error('pdf-libでテキストが抽出されませんでした')
        }
        
      } catch (pdflibError: any) {
        console.warn('⚠️ pdf-lib失敗:', pdflibError.message)
        
        // 方法3: 従来のpdf-parseを最後の手段として試行
        try {
          console.log('🔄 pdf-parse 最終フォールバック開始...')
          const buffer = Buffer.from(uint8Array)
          const text = await extractTextWithPDFParse(buffer)
          return text
          
        } catch (parseError: any) {
          console.error('❌ 全てのPDF処理方法が失敗:', parseError.message)
          
          // 方法4: 基本的なテキスト抽出
          console.log('🛡️ 基本テキスト抽出開始...')
          return await extractTextFallback(Buffer.from(uint8Array))
        }
      }
    }
    
  } catch (error: any) {
    console.error('❌ PDFテキスト抽出エラー:', error)
    throw new Error(`PDFファイルの解析に失敗しました: ${error.message}`)
  }
}

// PDF.js（pdfjs-dist）を使用したテキスト抽出
async function extractTextWithPDFJS(uint8Array: Uint8Array): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  
  // Vercel環境でのWorker設定を無効化（サーバーサイドでは不要）
  if (typeof window === 'undefined') {
    // サーバーサイド環境でWorkerを無効化
    pdfjsLib.GlobalWorkerOptions.workerSrc = ''
  }
  
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    stopAtErrors: false,
    useWorkerFetch: false,
    isEvalSupported: false,
    standardFontDataUrl: undefined // フォントデータURLを無効化
  })
  
  const pdf = await loadingTask.promise
  console.log(`📚 PDF.js: ${pdf.numPages}ページを検出`)
  
  let allText = ''
  let hasTextContent = false
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    try {
      console.log(`📄 ページ ${pageNum}/${pdf.numPages} 処理中...`)
      
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      let pageText = ''
      if (textContent.items.length > 0) {
        pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        
        if (pageText.length > 0) {
          hasTextContent = true
          allText += `\n=== ページ ${pageNum} ===\n${pageText}\n`
          console.log(`✅ ページ ${pageNum}: ${pageText.length}文字抽出`)
        } else {
          console.log(`⚠️ ページ ${pageNum}: テキストが検出されませんでした`)
        }
      } else {
        console.log(`⚠️ ページ ${pageNum}: テキストアイテムがありません`)
      }
      
    } catch (pageError) {
      console.warn(`⚠️ ページ ${pageNum} 処理エラー:`, pageError)
      continue
    }
  }
  
  if (!hasTextContent || allText.trim().length === 0) {
    console.log('🔄 テキストが抽出されませんでした。OCR処理に切り替えます...')
    // OCR処理にフォールバック
    return await extractTextWithOCR(uint8Array)
  }
  
  return allText.trim()
}

// Tesseract.js OCRを使用したテキスト抽出
async function extractTextWithOCR(uint8Array: Uint8Array): Promise<string> {
  console.log('🤖 Tesseract.js OCR処理開始...')
  
  try {
    // 軽量版OCR処理を試行
    return await extractTextWithSimpleOCR(uint8Array)
  } catch (ocrError: any) {
    console.error('❌ OCR処理エラー:', ocrError)
    
    // OCRが失敗した場合、PDF基本情報を返す
    console.log('🛡️ OCR失敗のため基本情報を返します')
    try {
      const pdfjsLib = await import('pdfjs-dist')
      
      if (typeof window === 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = ''
      }
      
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        useSystemFonts: true,
        stopAtErrors: false,
        useWorkerFetch: false,
        isEvalSupported: false
      })
      
      const pdf = await loadingTask.promise
      let basicInfo = `PDFファイル: ${pdf.numPages}ページ\n`
      
      for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 3); pageNum++) {
        try {
          const page = await pdf.getPage(pageNum)
          const viewport = page.getViewport({ scale: 1.0 })
          basicInfo += `ページ${pageNum}: ${viewport.width.toFixed(0)}x${viewport.height.toFixed(0)}\n`
        } catch (pageError) {
          basicInfo += `ページ${pageNum}: 情報取得エラー\n`
        }
      }
      
      return basicInfo + '\n画像形式のPDFファイルの可能性があります。手動でテキストを入力してください。'
      
    } catch (fallbackError: any) {
      throw new Error(`OCR処理とフォールバック処理の両方が失敗しました: ${ocrError.message}`)
    }
  }
}

// シンプルなOCR処理
async function extractTextWithSimpleOCR(uint8Array: Uint8Array): Promise<string> {
  console.log('🔧 シンプルOCR処理開始...')
  
  const pdfjsLib = await import('pdfjs-dist')
  
  // Vercel環境でのWorker設定を無効化
  if (typeof window === 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = ''
  }
  
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    stopAtErrors: false,
    useWorkerFetch: false,
    isEvalSupported: false
  })
  
  const pdf = await loadingTask.promise
  console.log(`🤖 OCR: ${pdf.numPages}ページを処理開始`)
  
  let allOcrText = ''
  
  for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 2); pageNum++) { // 最初の2ページのみ処理
    try {
      console.log(`🤖 ページ ${pageNum}/${pdf.numPages} OCR処理中...`)
      
      const page = await pdf.getPage(pageNum)
      
      // PDFページを画像に変換
      const viewport = page.getViewport({ scale: 1.5 }) // 解像度を下げて処理を高速化
      
      // Canvasを使用してページを画像として描画
      const { createCanvas } = await import('canvas')
      const canvas = createCanvas(viewport.width, viewport.height)
      const context = canvas.getContext('2d')
      
      const renderContext = {
        canvasContext: context as any,
        viewport: viewport
      }
      
      await page.render(renderContext).promise
      
      // CanvasをBase64画像に変換
      const dataUrl = canvas.toDataURL('image/png')
      
      // Tesseract.jsでOCR処理（シンプル版）
      console.log(`📊 ページ ${pageNum} OCR実行中...`)
      const ocrResult = await Tesseract.recognize(dataUrl, 'jpn+eng')
      
      const pageText = ocrResult.data.text.trim()
      
      if (pageText.length > 0) {
        allOcrText += `\n=== ページ ${pageNum} (OCR) ===\n${pageText}\n`
        console.log(`✅ ページ ${pageNum} OCR完了: ${pageText.length}文字`)
        console.log(`📄 ページ ${pageNum} テキスト例: ${pageText.substring(0, 100)}...`)
      } else {
        console.warn(`⚠️ ページ ${pageNum}: OCRでテキストが検出されませんでした`)
      }
      
    } catch (pageError: any) {
      console.error(`❌ ページ ${pageNum} OCRエラー:`, pageError)
      allOcrText += `\n=== ページ ${pageNum} (OCRエラー) ===\nOCR処理でエラーが発生しました: ${pageError.message}\n`
      continue
    }
  }
  
  if (allOcrText.trim().length === 0) {
    throw new Error('OCR処理でテキストが抽出されませんでした')
  }
  
  console.log(`🎯 シンプルOCR処理完了: 合計${allOcrText.length}文字抽出`)
  return allOcrText.trim()
}

// pdf-libを使用したテキスト抽出
async function extractTextWithPDFLib(uint8Array: Uint8Array): Promise<string> {
  const { PDFDocument } = await import('pdf-lib')
  
  const pdfDoc = await PDFDocument.load(uint8Array)
  const pages = pdfDoc.getPages()
  
  console.log(`📄 pdf-lib: ${pages.length}ページを検出`)
  
  let allText = ''
  
  for (let i = 0; i < pages.length; i++) {
    try {
      const page = pages[i]
      
      // pdf-libはテキスト抽出に制限があるため、基本的な情報のみ取得
      const { width, height } = page.getSize()
      
      // ページの基本情報をテキストとして追加
      const pageInfo = `=== ページ ${i + 1} ===\nサイズ: ${width.toFixed(0)}x${height.toFixed(0)}\n`
      allText += pageInfo
      
      console.log(`📄 ページ ${i + 1}: 基本情報取得`)
      
    } catch (pageError) {
      console.warn(`⚠️ ページ ${i + 1} 処理エラー:`, pageError)
      continue
    }
  }
  
  // pdf-libだけでは完全なテキスト抽出は困難なので、制限的な結果を返す
  if (allText.trim().length < 50) {
    throw new Error('pdf-libでは十分なテキストを抽出できませんでした')
  }
  
  return allText.trim()
}

// pdf-parseを使用したテキスト抽出（従来版、改良済み）
async function extractTextWithPDFParse(buffer: Buffer): Promise<string> {
  const pdfParse = await import('pdf-parse')
  
  const options = {
    max: 0,
    normalizeWhitespace: true,
    disableCombineTextItems: false
  }
  
  const data = await pdfParse.default(buffer, options)
  
  console.log(`📄 pdf-parse: ${data.numpages}ページ、${data.text.length}文字抽出`)
  
  if (!data.text || data.text.trim().length === 0) {
    throw new Error('pdf-parseでテキストが抽出されませんでした')
  }
  
  return data.text
}

// フォールバック：基本的なテキスト抽出
async function extractTextFallback(buffer: Buffer): Promise<string> {
  console.log('🛡️ フォールバック抽出開始...')
  
  // PDFヘッダーチェック
  const pdfHeader = buffer.slice(0, 5).toString()
  if (!pdfHeader.startsWith('%PDF')) {
    throw new Error('有効なPDFファイルではありません')
  }
  
  // 基本的なテキスト検索（非常にシンプルな方法）
  const content = buffer.toString('binary')
  const textMatches = content.match(/\(([^)]+)\)/g) || []
  
  let extractedText = ''
  
  for (const match of textMatches) {
    const text = match.slice(1, -1).trim()
    if (text.length > 2) {
      extractedText += text + ' '
    }
  }
  
  if (extractedText.trim().length < 10) {
    return 'PDFからテキストを抽出できませんでした。画像形式のPDFまたは読み取り困難な形式の可能性があります。'
  }
  
  return extractedText.trim()
}

// 問題文をテキストから抽出
export function parseQuestionsFromText(text: string): ExtractedQuestion[] {
  console.log('🔍 問題解析開始...')
  console.log(`📝 解析対象テキスト長: ${text.length}文字`)
  
  if (!text || text.trim().length < 50) {
    console.warn('⚠️ テキストが短すぎます（50文字未満）')
    return []
  }
  
  // OCRの結果が基本的な情報のみの場合、手動入力の案内を含める
  if (text.includes('画像形式のPDFファイルの可能性があります')) {
    console.log('ℹ️ 画像形式PDFが検出されました')
    return [{
      questionText: 'PDFの内容を読み取れませんでした。画像形式のPDFファイルのため、手動でテキストを入力してください。',
      choices: [
        '1. 管理画面で手動で問題を追加',
        '2. テキスト形式のPDFファイルを使用',
        '3. OCR処理をもう一度試行',
        '4. 別の方法で問題を作成'
      ],
      difficulty: 1
    }]
  }
  
  const blocks = splitIntoQuestionBlocks(text)
  console.log(`📚 検出された問題ブロック数: ${blocks.length}`)
  
  const questions: ExtractedQuestion[] = []
  
  for (let i = 0; i < blocks.length; i++) {
    console.log(`🔍 ブロック ${i + 1}/${blocks.length} を解析中...`)
    console.log(`📄 ブロック内容プレビュー: ${blocks[i].substring(0, 100)}...`)
    
    const question = parseQuestionBlock(blocks[i])
    if (question) {
      questions.push(question)
      console.log(`✅ 問題 ${questions.length} 抽出完了: ${question.questionText.substring(0, 50)}...`)
    } else {
      console.warn(`⚠️ ブロック ${i + 1} から問題を抽出できませんでした`)
    }
  }
  
  console.log(`🎯 問題解析完了: ${questions.length}問が抽出されました`)
  
  // 問題が抽出されなかった場合の詳細情報
  if (questions.length === 0) {
    console.log('ℹ️ 問題が抽出されませんでした。詳細分析を実行...')
    return analyzeUnparsableContent(text)
  }
  
  return questions
}

// 解析できないコンテンツの分析
function analyzeUnparsableContent(text: string): ExtractedQuestion[] {
  console.log('🔎 解析できないコンテンツの詳細分析開始...')
  
  const analysis = {
    textLength: text.length,
    hasNumbers: /\d/.test(text),
    hasJapanese: /[ひらがなカタカナ漢字]/.test(text),
    hasEnglish: /[A-Za-z]/.test(text),
    hasQuestionMarks: /[？?]/.test(text),
    hasChoiceMarkers: /[1-5ア-オa-eA-E①-⑤]/.test(text),
    lineCount: text.split('\n').length,
    wordCount: text.split(/\s+/).length
  }
  
  console.log('📊 コンテンツ分析結果:', analysis)
  
  let suggestionText = 'PDFの内容分析結果:\n\n'
  suggestionText += `- テキスト長: ${analysis.textLength}文字\n`
  suggestionText += `- 行数: ${analysis.lineCount}行\n`
  suggestionText += `- 日本語: ${analysis.hasJapanese ? '検出' : '未検出'}\n`
  suggestionText += `- 英語: ${analysis.hasEnglish ? '検出' : '未検出'}\n`
  suggestionText += `- 数字: ${analysis.hasNumbers ? '検出' : '未検出'}\n`
  suggestionText += `- 問題記号: ${analysis.hasQuestionMarks ? '検出' : '未検出'}\n`
  suggestionText += `- 選択肢記号: ${analysis.hasChoiceMarkers ? '検出' : '未検出'}\n\n`
  
  if (analysis.textLength < 100) {
    suggestionText += '問題: テキストが短すぎます。OCR処理が正常に動作していない可能性があります。\n'
  } else if (!analysis.hasJapanese && !analysis.hasEnglish) {
    suggestionText += '問題: 文字が正しく認識されていません。画像の品質を確認してください。\n'
  } else if (!analysis.hasQuestionMarks && !analysis.hasChoiceMarkers) {
    suggestionText += '問題: 問題や選択肢の形式が認識できません。フォーマットを確認してください。\n'
  } else {
    suggestionText += '部分的にテキストは認識されましたが、問題形式として解析できませんでした。\n'
  }
  
  suggestionText += '\n推奨対応:\n'
  suggestionText += '1. より高解像度のPDFファイルを使用\n'
  suggestionText += '2. テキスト形式のPDFファイルに変換\n'
  suggestionText += '3. 管理画面で手動入力\n'
  suggestionText += '4. 画像の品質改善'
  
  // テキストのサンプルを含める（最初の500文字）
  if (text.length > 0) {
    suggestionText += '\n\n抽出されたテキストサンプル:\n'
    suggestionText += '---\n'
    suggestionText += text.substring(0, 500)
    if (text.length > 500) {
      suggestionText += '\n...(続く)'
    }
    suggestionText += '\n---'
  }
  
  return [{
    questionText: suggestionText,
    choices: [
      '高解像度PDFで再試行',
      'テキスト形式PDFを使用',
      '手動で問題を入力',
      '画像品質を改善して再試行'
    ],
    difficulty: 1
  }]
}

// テキストを問題ブロックに分割
function splitIntoQuestionBlocks(text: string): string[] {
  console.log('📚 問題ブロック分割開始...')
  
  const blocks: string[] = []
  
  // 各パターンで問題番号を検索
  for (const pattern of QUESTION_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern))
    
    if (matches.length > 0) {
      console.log(`✅ パターンマッチ: ${matches.length}個の問題候補を検出`)
      
      // マッチした位置で分割
      for (let i = 0; i < matches.length - 1; i++) {
        const start = matches[i].index || 0
        const end = matches[i + 1].index || text.length
        const block = text.substring(start, end).trim()
        
        if (block.length > 20) {
          blocks.push(block)
        }
      }
      
      // 最後のブロック
      const lastMatch = matches[matches.length - 1]
      const lastBlock = text.substring(lastMatch.index || 0).trim()
      if (lastBlock.length > 20) {
        blocks.push(lastBlock)
      }
      
      if (blocks.length > 0) break // 最初に見つかったパターンを使用
    }
  }
  
  // 問題番号が見つからない場合は全体を1ブロックとして処理
  if (blocks.length === 0 && text.trim().length > 50) {
    blocks.push(text.trim())
  }
  
  return blocks
}

// 問題ブロックをパース
function parseQuestionBlock(block: string): ExtractedQuestion | null {
  try {
    // 問題文を抽出
    const questionText = extractQuestionText(block)
    if (!questionText || questionText.length < 10) {
      return null
    }
    
    // 選択肢を抽出
    const choices = extractChoicesFromBlock(block)
    if (choices.length < 2) {
      return null
    }
    
    return {
      questionText: questionText.trim(),
      choices: choices,
      difficulty: estimateDifficulty(questionText)
    }
  } catch (error) {
    console.warn('問題ブロック解析エラー:', error)
    return null
  }
}

// 問題文を抽出
function extractQuestionText(block: string): string {
  // 問題番号を除去
  let questionText = block.replace(/^(?:問題?\s*\d+\s*[．.\)）:：]|第?\s*\d+\s*問[．.\)）:：]?|\d+\s*[．.\)）:：])\s*/, '')
  
  // 選択肢の開始位置を検出
  let choiceStart = questionText.length
  
  for (const pattern of CHOICE_PATTERNS) {
    const match = pattern.exec(questionText)
    if (match && match.index !== undefined && match.index < choiceStart) {
      choiceStart = match.index
    }
    pattern.lastIndex = 0 // グローバル正規表現のリセット
  }
  
  // 問題文部分のみを抽出
  questionText = questionText.substring(0, choiceStart).trim()
  
  // 改行の正規化
  questionText = questionText.replace(/\s+/g, ' ').trim()
  
  return questionText
}

// 選択肢を抽出
function extractChoicesFromBlock(block: string): string[] {
  const choices: string[] = []
  
  for (const pattern of CHOICE_PATTERNS) {
    const matches = Array.from(block.matchAll(pattern))
    
    if (matches.length >= 2) {
      console.log(`📝 選択肢パターンマッチ: ${matches.length}個の選択肢を検出`)
      
      for (const match of matches) {
        if (match[2]) {
          choices.push(match[2].trim())
        } else if (match[1] && !match[2]) {
          choices.push(match[1].trim())
        }
      }
      
      if (choices.length >= 2) break // 十分な選択肢が見つかったら停止
    }
  }
  
  // 重複除去と空文字除去
  const uniqueChoices = Array.from(new Set(choices)).filter(choice => choice.length > 0)
  
  return uniqueChoices.slice(0, 5) // 最大5個まで
}

// 解答をテキストから抽出
export function parseAnswersFromText(text: string): number[] {
  console.log('🔍 解答解析開始...')
  
  const answers: number[] = []
  
  for (const pattern of ANSWER_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern))
    
    for (const match of matches) {
      const answerStr = match[1]
      let answerNum = 0
      
      // 数字への変換
      if (/\d/.test(answerStr)) {
        answerNum = parseInt(answerStr)
      } else if (/[ア-オ]/.test(answerStr)) {
        answerNum = answerStr.charCodeAt(0) - 'ア'.charCodeAt(0) + 1
      } else if (/[a-e]/.test(answerStr.toLowerCase())) {
        answerNum = answerStr.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 1
      } else if (/[①-⑤]/.test(answerStr)) {
        answerNum = answerStr.charCodeAt(0) - '①'.charCodeAt(0) + 1
      }
      
      if (answerNum >= 1 && answerNum <= 5) {
        answers.push(answerNum)
      }
    }
  }
  
  console.log(`🎯 解答解析完了: ${answers.length}個の解答を検出`)
  return answers
}

// 問題の難易度を推定
function estimateDifficulty(text: string): number {
  let difficulty = 1
  
  // 文字数による判定
  if (text.length > 200) difficulty += 1
  if (text.length > 400) difficulty += 1
  
  // キーワードによる判定
  const complexKeywords = [
    '複雑', '詳細', '高度', '専門', '応用', '分析', '統合', '評価',
    'complex', 'detailed', 'advanced', 'specialized', 'analysis'
  ]
  const foundComplex = complexKeywords.some(keyword => text.includes(keyword))
  if (foundComplex) difficulty += 1

  // 専門用語の判定
  const technicalTerms = [
    'hypothesis', 'methodology', 'paradigm', 'correlation',
    '仮説', '方法論', 'パラダイム', '相関', '因果関係'
  ]
  const foundTechnical = technicalTerms.some(term => text.includes(term))
  if (foundTechnical) difficulty += 1

  return Math.min(5, difficulty)
}

// メイン処理関数
export async function processQuizPDFs(
  questionFile: File,
  answerFile?: File
): Promise<ParsedQuizData> {
  try {
    console.log('=== PDF処理開始 ===')
    
    // 問題PDFからテキスト抽出
    const questionText = await extractTextFromPDF(questionFile)
    const questions = parseQuestionsFromText(questionText)

    let answers: number[] = []
    
    // 解答PDFが提供されている場合
    if (answerFile) {
      const answerText = await extractTextFromPDF(answerFile)
      answers = parseAnswersFromText(answerText)
    }

    // 解答と問題数の整合性チェック
    if (answers.length > 0 && answers.length !== questions.length) {
      console.warn(`⚠️ 問題数(${questions.length})と解答数(${answers.length})が一致しません`)
    }

    // 解答を問題に割り当て
    for (let i = 0; i < questions.length && i < answers.length; i++) {
      questions[i].correctAnswer = answers[i]
    }

    const result: ParsedQuizData = {
      questions,
      answers: answers.length > 0 ? answers : undefined,
      metadata: {
        totalQuestions: questions.length,
        extractedAt: new Date().toISOString(),
        source: questionFile.name
      }
    }

    console.log('=== PDF処理完了 ===')
    console.log(`📊 最終結果: ${questions.length}問、解答${answers.length}個`)
    
    return result

  } catch (error: any) {
    console.error('❌ PDF処理エラー:', error)
    throw new Error(`PDFから問題を抽出できませんでした。ファイルが画像形式または読み取り困難な形式の可能性があります。`)
  }
}
