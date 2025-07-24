import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'

// PDF.js worker設定
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

// 既存のインターフェースを維持
export interface ParsedQuestion {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_e: string
  correct_answer?: "A" | "B" | "C" | "D" | "E"
}

export interface ParsedAnswers {
  [questionNumber: string]: "A" | "B" | "C" | "D" | "E"
}

// 新しい拡張インターフェース
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

// PDFをテキストに変換する関数
async function pdfToText(file: File): Promise<string> {
  try {
    // PDF.jsを使用してPDFをテキストに変換
    const pdfjsLib = await import("pdfjs-dist")

    // PDF.js workerの設定
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let fullText = ""

    // 各ページのテキストを抽出
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      const pageText = textContent.items.map((item: any) => item.str).join(" ")

      fullText += pageText + "\n"
    }

    return fullText
  } catch (error) {
    console.error("PDF text extraction failed:", error)
    throw new Error("PDFからのテキスト抽出に失敗しました")
  }
}

// PDFを画像に変換してOCRを実行する関数（改良版）
async function pdfToImageOCR(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist")
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let fullText = ""

    console.log(`OCR処理開始: ${pdf.numPages}ページ`)

    // 各ページを高解像度で画像として処理
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`ページ ${pageNum}/${pdf.numPages} を処理中...`)
      
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 3.0 }) // 解像度を上げる

      // Canvasに描画
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")!
      canvas.height = viewport.height
      canvas.width = viewport.width

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise

      // CanvasをBlobに変換
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png")
      })

      // Tesseractの設定を最適化
      const {
        data: { text },
      } = await Tesseract.recognize(blob, "jpn+eng", {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR進捗: ${Math.round(m.progress * 100)}%`)
          }
        },
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: '1', // 自動ページセグメンテーション
        tessedit_ocr_engine_mode: '3', // LSTM + Legacy
      } as any)

      fullText += text + "\n\n"
      console.log(`ページ ${pageNum} 完了: ${text.length}文字抽出`)
    }

    console.log(`OCR完了: 合計${fullText.length}文字抽出`)
    return fullText
  } catch (error) {
    console.error("PDF OCR failed:", error)
    throw new Error("PDFのOCR処理に失敗しました")
  }
}

// テキストから5択問題を解析する関数（改良版）
function parseQuestionsFromText(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  
  console.log("解析対象テキスト（最初の500文字）:", text.substring(0, 500))

  // テキストを正規化（改行やスペースを統一）
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/[（(]\s*([ABCDE])\s*[）)]/g, '($1)')  // 選択肢の正規化

  // 問題パターンを検索（より柔軟なパターンに拡張）
  const questionPatterns = [
    // パターン1: 問1. 問題文... または 問 1 . 問題文...
    new RegExp('問\\s*(\\d+)\\s*[.．：:]\\s*(.*?)(?=問\\s*\\d+\\s*[.．：:]|$)', 'gi'),
    // パターン2: 1. 問題文... または 1 . 問題文...
    new RegExp('(?:^|\\n)\\s*(\\d+)\\s*[.．：:]\\s*(.*?)(?=(?:^|\\n)\\s*\\d+\\s*[.．：:]|$)', 'gi'),
    // パターン3: Q1 問題文... または Q 1 問題文...
    new RegExp('Q\\s*(\\d+)\\s*[.．：:]?\\s*(.*?)(?=Q\\s*\\d+|$)', 'gi'),
    // パターン4: 【問1】 または 【1】
    new RegExp('【\\s*(?:問\\s*)?(\\d+)\\s*】\\s*(.*?)(?=【\\s*(?:問\\s*)?\\d+\\s*】|$)', 'gi'),
    // パターン5: (1) 問題文... 
    new RegExp('[\\(（]\\s*(\\d+)\\s*[\\)）]\\s*(.*?)(?=[\\(（]\\s*\\d+\\s*[\\)）]|$)', 'gi'),
  ]

  let matches: RegExpMatchArray[] = []
  let usedPattern = -1

  // 各パターンでマッチを試行
  for (let i = 0; i < questionPatterns.length; i++) {
    const pattern = questionPatterns[i]
    const patternMatches = Array.from(normalizedText.matchAll(pattern))
    console.log(`パターン${i + 1}でのマッチ数:`, patternMatches.length)
    
    if (patternMatches.length > 0) {
      matches = patternMatches
      usedPattern = i + 1
      console.log(`パターン${usedPattern}を使用`)
      break
    }
  }

  if (matches.length === 0) {
    console.log("問題パターンが見つかりませんでした")
    return questions
  }

  for (const match of matches) {
    const questionNumber = match[1]
    const questionContent = match[2].trim()
    
    console.log(`問題${questionNumber}の内容:`, questionContent.substring(0, 200))

    // 選択肢を抽出（より柔軟なパターン）
    const optionPatterns = [
      // A. 選択肢 または A） 選択肢
      /([ABCDE])\s*[.．)）：:]\s*([^\n]*?)(?=[ABCDE]\s*[.．)）：:]|$)/g,
      // (A) 選択肢
      /[(（]\s*([ABCDE])\s*[)）]\s*([^\n]*?)(?=[(（]\s*[ABCDE]\s*[)）]|$)/g,
      // 1) A. 選択肢（番号付き）
      /\d+\s*[)）]\s*([ABCDE])\s*[.．]\s*([^\n]*?)(?=\d+\s*[)）]\s*[ABCDE]|$)/g,
    ]

    let options: { [key: string]: string } = {}
    
    for (const optionPattern of optionPatterns) {
      const optionMatches = Array.from(questionContent.matchAll(optionPattern))
      console.log(`選択肢パターンでのマッチ数:`, optionMatches.length)
      
      if (optionMatches.length >= 3) { // 最低3つの選択肢が必要
        for (const optionMatch of optionMatches) {
          const letter = optionMatch[1].toUpperCase()
          const text = optionMatch[2].trim()
          if (text) {
            options[letter] = text
          }
        }
        break
      }
    }

    // 問題文を抽出（選択肢部分を除去）
    let questionText = questionContent
    if (Object.keys(options).length > 0) {
      // 選択肢部分を削除
      questionText = questionContent.split(/[ABCDE]\s*[.．)）：:]/)[0].trim()
    }

    // 5択問題として処理
    if (Object.keys(options).length >= 3 && questionText.length > 10) {
      const question: ParsedQuestion = {
        question_text: questionText,
        option_a: options['A'] || '',
        option_b: options['B'] || '',
        option_c: options['C'] || '',
        option_d: options['D'] || '',
        option_e: options['E'] || '',
      }

      console.log(`問題${questionNumber}解析結果:`, {
        question_text: question.question_text.substring(0, 100),
        options_count: Object.keys(options).length
      })

      questions.push(question)
    }
  }

  console.log(`合計${questions.length}問の問題を解析しました`)
  return questions
}

// 解答を解析する関数（改良版）
function parseAnswersFromText(text: string): ParsedAnswers {
  const answers: ParsedAnswers = {}
  
  console.log("解答解析対象テキスト（最初の300文字）:", text.substring(0, 300))

  // テキストを正規化
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')

  // 解答パターンを検索（より多様なパターンに対応）
  const answerPatterns = [
    // パターン1: 問1 A, 問2 B... または 問1: A, 問2: B...
    new RegExp('問\\s*(\\d+)\\s*[：:]?\\s*([ABCDE])', 'gi'),
    // パターン2: 1. A, 2. B... または 1) A, 2) B...
    new RegExp('(\\d+)\\s*[.．\\)）]\\s*([ABCDE])', 'gi'),
    // パターン3: 1-A, 2-B... または 1－A, 2－B...
    new RegExp('(\\d+)\\s*[-－]\\s*([ABCDE])', 'gi'),
    // パターン4: 【1】A, 【2】B...
    new RegExp('【\\s*(\\d+)\\s*】\\s*([ABCDE])', 'gi'),
    // パターン5: (1)A, (2)B...
    new RegExp('[\\(（]\\s*(\\d+)\\s*[\\)）]\\s*([ABCDE])', 'gi'),
    // パターン6: 1番 A, 2番 B...
    new RegExp('(\\d+)\\s*番\\s*([ABCDE])', 'gi'),
    // パターン7: No.1 A, No.2 B...
    new RegExp('No\\.?\\s*(\\d+)\\s*([ABCDE])', 'gi'),
  ]

  for (let i = 0; i < answerPatterns.length; i++) {
    const pattern = answerPatterns[i]
    const matches = Array.from(normalizedText.matchAll(pattern))
    console.log(`解答パターン${i + 1}でのマッチ数:`, matches.length)
    
    if (matches.length > 0) {
      for (const match of matches) {
        const questionNum = match[1]
        const answer = match[2].toUpperCase() as "A" | "B" | "C" | "D" | "E"
        answers[questionNum] = answer
        console.log(`問題${questionNum}: ${answer}`)
      }
      
      // 有効な解答が見つかったらループを終了
      if (Object.keys(answers).length > 0) {
        console.log(`パターン${i + 1}で${Object.keys(answers).length}個の解答を発見`)
        break
      }
    }
  }

  return answers
}

export async function parseQuestionsPDF(file: File): Promise<ParsedQuestion[]> {
  try {
    console.log("PDFから問題を解析中...")

    let text = ""

    try {
      // まずテキスト抽出を試行
      text = await pdfToText(file)
      console.log("テキスト抽出成功")
    } catch (error) {
      console.log("テキスト抽出失敗、OCRを実行中...")
      // テキスト抽出が失敗した場合はOCRを実行
      text = await pdfToImageOCR(file)
      console.log("OCR実行成功")
    }

    if (!text.trim()) {
      throw new Error("PDFからテキストを抽出できませんでした")
    }

    const questions = parseQuestionsFromText(text)

    if (questions.length === 0) {
      throw new Error("有効な問題が見つかりませんでした。PDFの形式を確認してください。")
    }

    console.log(`${questions.length}問の問題を解析しました`)
    return questions
  } catch (error: any) {
    console.error("問題解析エラー:", error)
    throw new Error(`問題の解析に失敗しました: ${error.message}`)
  }
}

export async function parseAnswersPDF(file: File): Promise<ParsedAnswers> {
  try {
    console.log("PDFから解答を解析中...")

    let text = ""

    try {
      // まずテキスト抽出を試行
      text = await pdfToText(file)
    } catch (error) {
      // テキスト抽出が失敗した場合はOCRを実行
      text = await pdfToImageOCR(file)
    }

    if (!text.trim()) {
      throw new Error("PDFからテキストを抽出できませんでした")
    }

    const answers = parseAnswersFromText(text)

    console.log(`${Object.keys(answers).length}問の解答を解析しました`)
    return answers
  } catch (error: any) {
    console.error("解答解析エラー:", error)
    throw new Error(`解答の解析に失敗しました: ${error.message}`)
  }
}

export function matchQuestionsWithAnswers(questions: ParsedQuestion[], answers: ParsedAnswers): ParsedQuestion[] {
  return questions.map((question, index) => ({
    ...question,
    correct_answer: answers[(index + 1).toString()],
  }))
}

// デバッグ用：解析されたテキストを確認する関数（改良版）
export async function debugPDFText(file: File): Promise<string> {
  try {
    console.log("デバッグ: PDFファイル解析開始", file.name)
    let text = ""
    let method = ""
    
    try {
      text = await pdfToText(file)
      method = "PDF.js テキスト抽出"
      console.log("デバッグ: PDF.jsでテキスト抽出成功")
    } catch (error) {
      console.log("デバッグ: PDF.js失敗、OCR実行中...")
      text = await pdfToImageOCR(file)
      method = "Tesseract.js OCR"
      console.log("デバッグ: OCR実行成功")
    }
    
    console.log(`デバッグ: 抽出方法: ${method}`)
    console.log(`デバッグ: テキスト長: ${text.length}文字`)
    console.log("デバッグ: 抽出テキスト（最初の1000文字）:")
    console.log(text.substring(0, 1000))
    
    return `=== デバッグ情報 ===
ファイル名: ${file.name}
抽出方法: ${method}
テキスト長: ${text.length}文字

=== 抽出されたテキスト ===
${text}

=== 問題解析テスト ===
${debugQuestionParsing(text)}

=== 解答解析テスト ===
${debugAnswerParsing(text)}`
    
  } catch (error: any) {
    console.error("デバッグ: PDFテキスト抽出エラー:", error)
    throw new Error(`PDFテキスト抽出エラー: ${error.message}`)
  }
}

// 問題解析のデバッグ
function debugQuestionParsing(text: string): string {
  let debugInfo = ""
  
  const questionPatterns = [
    { name: "問1. 形式", pattern: new RegExp('問\\s*(\\d+)\\s*[.．：:]', 'gi') },
    { name: "1. 形式", pattern: new RegExp('(?:^|\\n)\\s*(\\d+)\\s*[.．：:]', 'gi') },
    { name: "Q1 形式", pattern: new RegExp('Q\\s*(\\d+)', 'gi') },
    { name: "【問1】形式", pattern: new RegExp('【\\s*(?:問\\s*)?(\\d+)\\s*】', 'gi') },
    { name: "(1) 形式", pattern: new RegExp('[\\(（]\\s*(\\d+)\\s*[\\)）]', 'gi') },
  ]
  
  for (const { name, pattern } of questionPatterns) {
    const matches = Array.from(text.matchAll(pattern))
    debugInfo += `${name}: ${matches.length}個のマッチ\n`
    if (matches.length > 0) {
      debugInfo += `  例: ${matches.slice(0, 3).map(m => m[0]).join(', ')}\n`
    }
  }
  
  return debugInfo
}

// 解答解析のデバッグ
function debugAnswerParsing(text: string): string {
  let debugInfo = ""
  
  const answerPatterns = [
    { name: "問1 A 形式", pattern: new RegExp('問\\s*(\\d+)\\s*[：:]?\\s*([ABCDE])', 'gi') },
    { name: "1. A 形式", pattern: new RegExp('(\\d+)\\s*[.．\\)）]\\s*([ABCDE])', 'gi') },
    { name: "1-A 形式", pattern: new RegExp('(\\d+)\\s*[-－]\\s*([ABCDE])', 'gi') },
    { name: "【1】A 形式", pattern: new RegExp('【\\s*(\\d+)\\s*】\\s*([ABCDE])', 'gi') },
    { name: "(1)A 形式", pattern: new RegExp('[\\(（]\\s*(\\d+)\\s*[\\)）]\\s*([ABCDE])', 'gi') },
  ]
  
  for (const { name, pattern } of answerPatterns) {
    const matches = Array.from(text.matchAll(pattern))
    debugInfo += `${name}: ${matches.length}個のマッチ\n`
    if (matches.length > 0) {
      debugInfo += `  例: ${matches.slice(0, 3).map(m => `${m[1]}→${m[2]}`).join(', ')}\n`
    }
  }
  
  return debugInfo
}

// === 拡張されたOCR機能 ===

// 日本語・英語対応の正規表現パターン
const QUESTION_PATTERNS = [
  /(?:問題?|Question|Q)[\s\d]+[．.\)）]\s*(.+?)(?=(?:問題?|Question|Q)[\s\d]+[．.\)）]|\s*[1-5ア-オa-e]\s*[\.．\)）]|$)/gms,
  /(\d+)[．.\)）]\s*(.+?)(?=\d+[．.\)）]|\s*[1-5ア-オa-e]\s*[\.．\)）]|$)/gms,
  /(?:^|\n)\s*(.+?\?)\s*(?=\n\s*[1-5ア-オa-e]|\n\s*[1-5]\s*[\.．\)）]|$)/gm,
  /(?:次の|以下の|下記の)(.+?)(?:選択|選ん|答え)/g,
  /(.+?)(?:について|に関して|で)(?:正しい|適切な|最も|もっとも)(?:もの|答え|選択肢)(?:を|は)/g
]

const CHOICE_PATTERNS = [
  /^[1-5ア-オa-e]\s*[\.．\)）]\s*(.+?)$/gm,
  /^[①-⑤]\s*(.+?)$/gm,
  /^[A-E]\s*[\.．\)）]\s*(.+?)$/gm,
  /^\([1-5ア-オa-e]\)\s*(.+?)$/gm,
  /^[1-5]\s*:\s*(.+?)$/gm,
  /^[・•]\s*(.+?)$/gm,
  /^\d+\)\s*(.+?)$/gm
]

const ANSWER_PATTERNS = [
  /(?:答え?|解答|Answer|正解)[\s：:]*(?:問題?[\s\d]*)?[：:\s]*([1-5ア-オa-eA-E①-⑤])/g,
  /(?:問題?[\s\d]+)[：:\s]*([1-5ア-オa-eA-E①-⑤])/g,
  /([1-5ア-オa-eA-E①-⑤])\s*(?:が正解|正答|○|✓)/g,
  /^([1-5ア-オa-eA-E①-⑤])[．.\)）]/gm,
  /(?:^|\s)([1-5ア-オa-eA-E①-⑤])(?:\s|$)/g,
  /\(([1-5ア-オa-eA-E①-⑤])\)/g,
  /【([1-5ア-オa-eA-E①-⑤])】/g
]

// PDFからテキストを抽出（拡張版）
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
    let fullText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n\n'
    }

    // OCRも実行してテキスト認識を補強
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
      
      for (let i = 1; i <= Math.min(3, pdf.numPages); i++) { // 最初の3ページのみOCR
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 })
        canvas.width = viewport.width
        canvas.height = viewport.height
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise

        const { data: { text } } = await Tesseract.recognize(canvas, 'jpn+eng', {
          logger: () => {} // ログを無効化
        })
        
        if (text.trim()) {
          fullText += '\n--- OCR補強テキスト ---\n' + text
        }
      }
    } catch (ocrError) {
      console.warn('OCR補強に失敗:', ocrError)
    }

    return fullText
  } catch (error) {
    console.error('PDF解析エラー:', error)
    throw new Error('PDFファイルの解析に失敗しました')
  }
}

// 選択肢番号を数字に変換
function convertChoiceToNumber(choice: string): number {
  const choiceMap: { [key: string]: number } = {
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    'ア': 1, 'イ': 2, 'ウ': 3, 'エ': 4, 'オ': 5,
    'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5,
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5,
    '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5
  }
  return choiceMap[choice] || 1
}

// テキストから問題を抽出（拡張版）
export function parseQuestionsFromTextEnhanced(text: string): ExtractedQuestion[] {
  console.log('=== 問題抽出開始 ===')
  const questions: ExtractedQuestion[] = []
  
  // テキストをクリーンアップ
  const cleanText = text
    .replace(/\s+/g, ' ') // 複数の空白を1つに
    .replace(/\n+/g, '\n') // 複数の改行を1つに
    .trim()

  // 複数のパターンで問題を検索
  for (const pattern of QUESTION_PATTERNS) {
    const matches = Array.from(cleanText.matchAll(new RegExp(pattern.source, pattern.flags)))
    
    for (const match of matches) {
      const questionText = match[1] || match[2] || match[0]
      if (!questionText || questionText.length < 10) continue

      // この問題の選択肢を検索
      const choices = extractChoicesAfterQuestion(cleanText, match.index || 0)
      
      if (choices.length >= 2) {
        questions.push({
          questionText: questionText.trim(),
          choices: choices,
          difficulty: estimateDifficulty(questionText)
        })
        
        console.log(`問題発見: ${questionText.substring(0, 50)}...`)
        console.log(`選択肢: ${choices.join(', ')}`)
      }
    }
  }

  console.log(`=== 抽出完了: ${questions.length}問 ===`)
  return questions
}

// 問題の後に続く選択肢を抽出
function extractChoicesAfterQuestion(text: string, questionIndex: number): string[] {
  const afterQuestion = text.substring(questionIndex)
  const choices: string[] = []

  for (const pattern of CHOICE_PATTERNS) {
    const matches = Array.from(afterQuestion.matchAll(new RegExp(pattern.source, pattern.flags)))
    
    for (const match of matches) {
      const choice = match[1]?.trim()
      if (choice && choice.length > 1 && choice.length < 200) {
        choices.push(choice)
        if (choices.length >= 5) break
      }
    }
    
    if (choices.length >= 2) break
  }

  return choices.slice(0, 5) // 最大5選択肢
}

// テキストから解答を抽出（拡張版）
export function parseAnswersFromTextEnhanced(text: string): number[] {
  console.log('=== 解答抽出開始 ===')
  const answers: number[] = []
  
  for (const pattern of ANSWER_PATTERNS) {
    const matches = Array.from(text.matchAll(new RegExp(pattern.source, pattern.flags)))
    
    for (const match of matches) {
      const answerChar = match[1]
      if (answerChar) {
        const answerNum = convertChoiceToNumber(answerChar)
        answers.push(answerNum)
        console.log(`解答発見: ${answerChar} -> ${answerNum}`)
      }
    }
  }

  console.log(`=== 解答抽出完了: ${answers.length}個 ===`)
  return answers
}

// 問題の難易度を推定
function estimateDifficulty(questionText: string): number {
  const text = questionText.toLowerCase()
  let difficulty = 1

  // 長さベースの判定
  if (text.length > 200) difficulty += 1
  if (text.length > 400) difficulty += 1

  // キーワードベースの判定
  const complexKeywords = [
    'analyze', 'evaluate', 'synthesize', 'compare', 'contrast',
    '分析', '評価', '統合', '比較', '対照', '推論', '批判的'
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
    const questions = parseQuestionsFromTextEnhanced(questionText)

    let answers: number[] = []
    
    // 解答PDFが提供されている場合
    if (answerFile) {
      const answerText = await extractTextFromPDF(answerFile)
      answers = parseAnswersFromTextEnhanced(answerText)
    }

    // 解答を問題に関連付け
    const questionsWithAnswers = questions.map((q, index) => ({
      ...q,
      correctAnswer: answers[index] || undefined
    }))

    return {
      questions: questionsWithAnswers,
      answers,
      metadata: {
        totalQuestions: questions.length,
        extractedAt: new Date().toISOString(),
        source: questionFile.name
      }
    }
  } catch (error) {
    console.error('PDF処理エラー:', error)
    throw error
  }
}

// 既存のインターフェースとの互換性のための変換関数
export function convertToLegacyFormat(questions: ExtractedQuestion[]): ParsedQuestion[] {
  return questions.map(q => ({
    question_text: q.questionText,
    option_a: q.choices[0] || '',
    option_b: q.choices[1] || '',
    option_c: q.choices[2] || '',
    option_d: q.choices[3] || '',
    option_e: q.choices[4] || '',
    correct_answer: q.correctAnswer ? 
      ['A', 'B', 'C', 'D', 'E'][q.correctAnswer - 1] as "A" | "B" | "C" | "D" | "E" : 
      undefined
  }))
}
