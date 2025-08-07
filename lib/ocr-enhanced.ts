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

// PDFからテキストを抽出（pdf-parse使用）
export async function extractTextFromPDF(file: File): Promise<string> {
  console.log('📄 PDFテキスト抽出開始...')
  
  try {
    // pdf-parseを動的にインポート
    const pdfParse = await import('pdf-parse')
    
    // FileをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // pdf-parseでテキストを抽出
    const data = await pdfParse.default(buffer)
    
    console.log(`✅ PDFテキスト抽出完了: ${data.text.length}文字`)
    
    // デバッグ用テキスト表示
    console.log('=== 抽出されたテキスト（最初の1000文字）===')
    console.log(data.text.substring(0, 1000))
    console.log('=== テキスト終了 ===')
    
    return data.text
  } catch (error: any) {
    console.error('❌ PDFテキスト抽出エラー:', error)
    throw new Error(`PDFファイルの解析に失敗しました: ${error.message}`)
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

// テキストから問題を抽出（改善版）
export function parseQuestionsFromText(text: string): ExtractedQuestion[] {
  console.log('🔍 問題抽出開始...')
  const questions: ExtractedQuestion[] = []
  
  // テキストを正規化
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u3000\s]+/g, ' ') // 全角・半角スペースを統一
    .replace(/[．.。]/g, '.') // 句読点を統一
    .replace(/[（(]/g, '(')
    .replace(/[）)]/g, ')')
    .replace(/[：:]/g, ':')
    .trim()

  console.log('📊 正規化済みテキスト長:', normalizedText.length)
  
  // ページ区切りで分割して処理
  const pages = normalizedText.split(/=== ページ \d+ ===/).filter(page => page.trim())
  
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const pageText = pages[pageIndex]
    console.log(`📄 ページ ${pageIndex + 1} 処理中... (${pageText.length}文字)`)
    
    // 問題ブロックを抽出
    const questionBlocks = extractQuestionBlocks(pageText)
    
    for (const block of questionBlocks) {
      const question = parseQuestionBlock(block)
      if (question && question.choices.length >= 2) {
        questions.push(question)
        console.log(`✅ 問題 ${questions.length}: ${question.questionText.substring(0, 50)}...`)
        console.log(`   選択肢数: ${question.choices.length}`)
      }
    }
  }

  console.log(`🎯 抽出完了: ${questions.length}問`)
  return questions
}

// 問題ブロックを抽出
function extractQuestionBlocks(text: string): string[] {
  const blocks: string[] = []
  
  // 問題番号で分割
  const questionMarkers = [
    /(?:問題?\s*\d+\s*[．.\)）:：]|第?\s*\d+\s*問[．.\)）:：]?)/gi,
    /(?:^|\n)\s*\d+\s*[．.\)）:：]/gm
  ]
  
  for (const pattern of questionMarkers) {
    const matches = Array.from(text.matchAll(pattern))
    
    if (matches.length >= 2) {
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
  let text = block
    .replace(/^(?:問題?\s*\d+\s*[．.\)）:：]|第?\s*\d+\s*問[．.\)）:：]?)\s*/i, '')
    .replace(/^\d+\s*[．.\)）:：]\s*/, '')
  
  // 選択肢の開始位置を見つける
  const choiceStart = findChoiceStart(text)
  if (choiceStart > 0) {
    text = text.substring(0, choiceStart)
  }
  
  return text.trim()
}

// 選択肢の開始位置を見つける
function findChoiceStart(text: string): number {
  const lines = text.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (/^[1-5ア-オa-eA-E①-⑤]\s*[．.\)）:]/.test(line) ||
        /^\([1-5ア-オa-eA-E①-⑤]\)/.test(line)) {
      // この行までの文字数を計算
      return lines.slice(0, i).join('\n').length
    }
  }
  
  return -1
}

// ブロックから選択肢を抽出
function extractChoicesFromBlock(block: string): string[] {
  const choices: string[] = []
  const lines = block.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    for (const pattern of CHOICE_PATTERNS) {
      const match = trimmedLine.match(pattern)
      if (match) {
        const choice = match[2] || match[1] // 選択肢テキスト
        if (choice && choice.length > 1 && choice.length < 300) {
          choices.push(choice.trim())
          break
        }
      }
    }
    
    if (choices.length >= 5) break
  }
  
  return choices
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
