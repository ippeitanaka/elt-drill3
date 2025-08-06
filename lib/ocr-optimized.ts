import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'

// PDF.js worker設定
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

export interface BatchProcessResult {
  success: boolean
  processedPages: number
  totalPages: number
  extractedQuestions: ExtractedQuestion[]
  errors: string[]
  metadata: {
    startTime: string
    endTime?: string
    fileSize: number
    processingTime?: number
  }
}

export interface ExtractedQuestion {
  questionText: string
  choices: string[]
  correctAnswer?: number
  explanation?: string
  difficulty?: number
  pageNumber?: number
  questionNumber?: number
}

export interface ProcessingProgress {
  currentPage: number
  totalPages: number
  extractedQuestions: number
  estimatedTimeRemaining?: number
  status: 'processing' | 'completed' | 'error'
  message?: string
}

// 大容量PDF用の最適化されたテキスト抽出
export async function extractTextFromPDFOptimized(
  file: File,
  options: {
    maxPages?: number
    batchSize?: number
    quality?: 'low' | 'medium' | 'high'
    onProgress?: (progress: ProcessingProgress) => void
  } = {}
): Promise<string> {
  const {
    maxPages = 100,
    batchSize = 5,
    quality = 'medium',
    onProgress
  } = options

  console.log('=== 最適化PDF抽出開始 ===', {
    fileSize: file.size,
    maxPages,
    batchSize,
    quality
  })

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const totalPages = Math.min(pdf.numPages, maxPages)
    
    let extractedText = ''
    let processedPages = 0
    const startTime = Date.now()

    onProgress?.({
      currentPage: 0,
      totalPages,
      extractedQuestions: 0,
      status: 'processing',
      message: 'PDF読み込み完了、テキスト抽出開始...'
    })

    // バッチ処理でページを処理
    for (let i = 1; i <= totalPages; i += batchSize) {
      const batchEnd = Math.min(i + batchSize - 1, totalPages)
      const batchPromises: Promise<{ pageNum: number; text: string }>[] = []

      // バッチ内のページを並列処理
      for (let pageNum = i; pageNum <= batchEnd; pageNum++) {
        batchPromises.push(
          pdf.getPage(pageNum).then(async (page) => {
            try {
              const textContent = await page.getTextContent()
              const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ')
              
              // メモリリークを防ぐためにページをクリーンアップ
              page.cleanup?.()
              
              return { pageNum, text: pageText }
            } catch (error) {
              console.warn(`ページ ${pageNum} のテキスト抽出に失敗:`, error)
              return { pageNum, text: '' }
            }
          })
        )
      }

      // バッチ処理結果を取得
      const batchResults = await Promise.all(batchPromises)
      
      // テキストを結合
      for (const result of batchResults.sort((a, b) => a.pageNum - b.pageNum)) {
        extractedText += `\n\n--- ページ ${result.pageNum} ---\n${result.text}`
        processedPages++

        // 進捗報告
        const elapsedTime = Date.now() - startTime
        const estimatedTimeRemaining = totalPages > processedPages 
          ? (elapsedTime / processedPages) * (totalPages - processedPages)
          : 0

        onProgress?.({
          currentPage: processedPages,
          totalPages,
          extractedQuestions: 0, // 後で更新
          estimatedTimeRemaining: Math.round(estimatedTimeRemaining / 1000),
          status: 'processing',
          message: `ページ ${processedPages}/${totalPages} 処理完了`
        })
      }

      // バッチ間での短い休憩（メモリ解放）
      if (i + batchSize <= totalPages) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log('PDF抽出完了:', {
      totalPages: processedPages,
      textLength: extractedText.length,
      processingTime: Date.now() - startTime
    })

    return extractedText

  } catch (error) {
    console.error('PDF抽出エラー:', error)
    throw new Error(`PDF抽出に失敗しました: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// 最適化された問題解析
export function parseQuestionsFromTextOptimized(
  text: string,
  options: {
    expectedQuestions?: number
    questionPattern?: RegExp
    onProgress?: (progress: ProcessingProgress) => void
  } = {}
): ExtractedQuestion[] {
  const { expectedQuestions = 100, onProgress } = options

  console.log('=== 問題解析開始 ===', {
    textLength: text.length,
    expectedQuestions
  })

  const questions: ExtractedQuestion[] = []
  
  try {
    // 問題パターンの改善（複数パターンに対応）
    const questionPatterns = [
      /問題?\s*(\d+)\.?\s*([^問]+?)(?=問題?\s*\d+|$)/gs,
      /(\d+)[\s\.]\s*([^0-9]+?)(?=\d+[\s\.]|$)/gs,
      /第?\s*(\d+)\s*問\s*([^第]+?)(?=第?\s*\d+\s*問|$)/gs
    ]

    let bestMatches: RegExpMatchArray[] = []
    let bestPattern: RegExp | null = null

    // 最も多くの問題を抽出できるパターンを選択
    for (const pattern of questionPatterns) {
      const matches = Array.from(text.matchAll(pattern))
      if (matches.length > bestMatches.length) {
        bestMatches = matches
        bestPattern = pattern
      }
    }

    console.log(`最適パターン選択: ${bestMatches.length}問検出`)

    bestMatches.forEach((match, index) => {
      try {
        const questionNumber = parseInt(match[1])
        const questionContent = match[2].trim()

        // 選択肢の抽出（複数パターンに対応）
        const choicePatterns = [
          /[（(]([1-5])[）)]\s*([^（(]+?)(?=[（(][1-5][）)]|$)/g,
          /([1-5])[\s\.\)]\s*([^1-5]+?)(?=[1-5][\s\.\)]|$)/g,
          /[ア-オ]\s*([^ア-オ]+?)(?=[ア-オ]|$)/g
        ]

        let choices: string[] = []
        for (const choicePattern of choicePatterns) {
          const choiceMatches = Array.from(questionContent.matchAll(choicePattern))
          if (choiceMatches.length > choices.length) {
            choices = choiceMatches.map(m => m[2] || m[1]).map(c => c.trim())
          }
        }

        // 問題文の抽出（選択肢を除去）
        let questionText = questionContent
        choices.forEach(choice => {
          questionText = questionText.replace(choice, '')
        })
        questionText = questionText.replace(/[（(][1-5][）)]/g, '').trim()

        if (questionText && choices.length >= 2) {
          questions.push({
            questionText,
            choices,
            questionNumber,
            pageNumber: Math.floor(index / 10) + 1 // 推定ページ番号
          })
        }

        // 進捗報告
        if ((index + 1) % 10 === 0) {
          onProgress?.({
            currentPage: index + 1,
            totalPages: bestMatches.length,
            extractedQuestions: questions.length,
            status: 'processing',
            message: `問題 ${index + 1}/${bestMatches.length} 解析完了`
          })
        }

      } catch (error) {
        console.warn(`問題 ${index + 1} の解析に失敗:`, error)
      }
    })

    console.log('問題解析完了:', {
      totalQuestions: questions.length,
      averageChoices: questions.reduce((sum, q) => sum + q.choices.length, 0) / questions.length
    })

    return questions

  } catch (error) {
    console.error('問題解析エラー:', error)
    return questions
  }
}

// バッチ処理メイン関数
export async function processQuizPDFsBatch(
  questionFile: File,
  answerFile?: File,
  options: {
    batchSize?: number
    maxPages?: number
    quality?: 'low' | 'medium' | 'high'
    onProgress?: (progress: ProcessingProgress) => void
  } = {}
): Promise<BatchProcessResult> {
  const startTime = Date.now()
  const metadata = {
    startTime: new Date().toISOString(),
    fileSize: questionFile.size
  }

  try {
    options.onProgress?.({
      currentPage: 0,
      totalPages: 0,
      extractedQuestions: 0,
      status: 'processing',
      message: 'PDF処理を開始しています...'
    })

    // 最適化されたテキスト抽出
    const questionText = await extractTextFromPDFOptimized(questionFile, {
      ...options,
      onProgress: (progress) => {
        options.onProgress?.({
          ...progress,
          message: `PDF読み込み中: ${progress.message}`
        })
      }
    })

    // 問題解析
    const questions = parseQuestionsFromTextOptimized(questionText, {
      onProgress: (progress) => {
        options.onProgress?.({
          ...progress,
          message: `問題解析中: ${progress.message}`
        })
      }
    })

    // 解答ファイルの処理（オプション）
    let answers: number[] = []
    if (answerFile) {
      try {
        const answerText = await extractTextFromPDFOptimized(answerFile, {
          maxPages: 20, // 解答ファイルは通常短い
          batchSize: 5
        })
        answers = parseAnswersFromText(answerText)
      } catch (error) {
        console.warn('解答ファイル処理エラー:', error)
      }
    }

    // 解答を問題に関連付け
    const questionsWithAnswers = questions.map((q, index) => ({
      ...q,
      correctAnswer: answers[index] || undefined
    }))

    const endTime = Date.now()
    const processingTime = endTime - startTime

    options.onProgress?.({
      currentPage: questions.length,
      totalPages: questions.length,
      extractedQuestions: questions.length,
      status: 'completed',
      message: `処理完了: ${questions.length}問を抽出しました`
    })

    return {
      success: true,
      processedPages: 0, // PDF pages processed
      totalPages: 0,
      extractedQuestions: questionsWithAnswers,
      errors: [],
      metadata: {
        ...metadata,
        endTime: new Date().toISOString(),
        processingTime
      }
    }

  } catch (error) {
    console.error('バッチ処理エラー:', error)
    
    options.onProgress?.({
      currentPage: 0,
      totalPages: 0,
      extractedQuestions: 0,
      status: 'error',
      message: `処理エラー: ${error instanceof Error ? error.message : String(error)}`
    })

    return {
      success: false,
      processedPages: 0,
      totalPages: 0,
      extractedQuestions: [],
      errors: [error instanceof Error ? error.message : String(error)],
      metadata
    }
  }
}

// 簡単な解答解析関数
function parseAnswersFromText(text: string): number[] {
  const answers: number[] = []
  
  // 解答パターンの検出
  const answerPatterns = [
    /(\d+)[\s\.]*[：:]\s*([1-5])/g,
    /問題?\s*(\d+)\s*[：:]\s*([1-5])/g,
    /(\d+)[）)]\s*([1-5])/g
  ]

  for (const pattern of answerPatterns) {
    const matches = Array.from(text.matchAll(pattern))
    if (matches.length > answers.length) {
      answers.length = 0 // リセット
      matches.forEach(match => {
        const questionNum = parseInt(match[1])
        const answerNum = parseInt(match[2])
        answers[questionNum - 1] = answerNum - 1 // 0-based index
      })
    }
  }

  return answers
}
