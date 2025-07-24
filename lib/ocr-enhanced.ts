import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'

// PDF.js worker設定
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

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

// デバッグ用のテキスト表示関数
export function debugPDFText(text: string): void {
  console.log('=== PDF抽出テキスト ===')
  console.log(text.substring(0, 2000) + (text.length > 2000 ? '...' : ''))
  console.log('=== テキスト終了 ===')
}

// PDFからテキストを抽出
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

// テキストから問題を抽出
export function parseQuestionsFromText(text: string): ExtractedQuestion[] {
  console.log('=== 問題抽出開始 ===')
  const questions: ExtractedQuestion[] = []
  
  // テキストをクリーンアップ
  const cleanText = text
    .replace(/\s+/g, ' ') // 複数の空白を1つに
    .replace(/\n+/g, '\n') // 複数の改行を1つに
    .trim()

  debugPDFText(cleanText)

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

// テキストから解答を抽出
export function parseAnswersFromText(text: string): number[] {
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
    const questions = parseQuestionsFromText(questionText)

    let answers: number[] = []
    
    // 解答PDFが提供されている場合
    if (answerFile) {
      const answerText = await extractTextFromPDF(answerFile)
      answers = parseAnswersFromText(answerText)
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
