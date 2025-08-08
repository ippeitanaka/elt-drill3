import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

interface Question {
  question_text: string
  options: Record<string, string>
  correct_answers: string[]
  question_number: number
}

interface ProcessTextRequest {
  extractedText: string
  category: string
  fileName?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 テキスト処理API開始')
    
    const { extractedText, category, fileName }: ProcessTextRequest = await request.json()

    if (!extractedText || !category) {
      return NextResponse.json(
        { error: 'extractedTextとcategoryは必須です' },
        { status: 400 }
      )
    }

    console.log(`📄 処理対象: ${fileName || 'Unknown file'}`)
    console.log(`📝 テキスト長: ${extractedText.length} 文字`)
    console.log(`🏷️ カテゴリー: ${category}`)

    // サービスロールクライアントを作成（RLSをバイパス）
    const supabase = createServerClient()

    // 問題セットを作成
    const questionSetName = fileName 
      ? `${fileName.replace('.pdf', '')} - 自動抽出`
      : `テキスト抽出 - ${new Date().toLocaleDateString('ja-JP')}`

    const { data: questionSet, error: setError } = await supabase
      .from('question_sets')
      .insert([{
        category_id: parseInt(category),
        name: questionSetName
      }])
      .select('id')
      .single()

    if (setError) {
      console.error('❌ 問題セット作成エラー:', setError)
      return NextResponse.json(
        { error: '問題セットの作成に失敗しました', details: setError.message },
        { status: 500 }
      )
    }

    console.log(`✅ 問題セット作成完了: ID ${questionSet.id}`)

    // テキストから問題を抽出
    const questions = extractQuestionsFromText(extractedText)
    console.log(`🔍 抽出された問題数: ${questions.length}`)

    if (questions.length === 0) {
      return NextResponse.json({
        success: true,
        message: '問題が見つかりませんでした',
        questionSetId: questionSet.id,
        questionsFound: 0,
        textAnalysis: {
          textLength: extractedText.length,
          possibleQuestions: findPossibleQuestionIndicators(extractedText)
        }
      })
    }

    // 問題をデータベースに保存
    const questionsToInsert = questions.map((q, index) => ({
      question_set_id: questionSet.id,
      question_number: index + 1,
      question_text: q.question_text,
      options: JSON.stringify(q.options),
      correct_answers: JSON.stringify(q.correct_answers)
    }))

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select('id')

    if (insertError) {
      console.error('❌ 問題挿入エラー:', insertError)
      return NextResponse.json(
        { error: '問題の保存に失敗しました', details: insertError.message },
        { status: 500 }
      )
    }

    console.log(`✅ 問題保存完了: ${insertedQuestions?.length || 0} 問`)

    return NextResponse.json({
      success: true,
      message: `${questions.length}問の問題を正常に抽出・保存しました`,
      questionSetId: questionSet.id,
      questionsFound: questions.length,
      questionsProcessed: insertedQuestions?.length || 0,
      extractedQuestions: questions.slice(0, 3).map(q => ({
        question: q.question_text.substring(0, 100) + '...',
        optionCount: Object.keys(q.options).length
      }))
    })

  } catch (error) {
    console.error('❌ テキスト処理エラー:', error)
    return NextResponse.json(
      { 
        error: 'テキスト処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function extractQuestionsFromText(text: string): Question[] {
  const questions: Question[] = []
  
  // テキストを正規化
  const normalizedText = text
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim()

  // テキストをクリーンアップ
  const cleanText = normalizedText
    .replace(/\s+/g, ' ') // 複数の空白を1つに
    .replace(/[^\S\r\n]+/g, ' ') // 改行以外の空白文字を統一
    .replace(/\r\n/g, '\n') // 改行の統一
    .replace(/\r/g, '\n') // 改行の統一
    .trim()

  console.log('🔍 クリーンアップ後テキスト長:', cleanText.length)
  console.log('🔍 クリーンアップ後先頭100文字:', cleanText.substring(0, 100))

  // より強力で柔軟な問題分割パターン（拡張版）
  const questionSplitPatterns = [
    // 基本的な問題番号パターン
    /(?:^|\n)\s*(?:問題?\s*)?(\d+)[：。:\s\)）\.]\s*(?![abcdeアイウエオ12345])/gm,
    /(?:^|\n)\s*(?:第?\s*)?(\d+)\s*問[：。:\s\)）\.]/gm,
    /(?:^|\n)\s*Q\s*(\d+)[：。:\s\)）\.]/gmi,
    /(?:^|\n)\s*No\s*\.?\s*(\d+)[：。:\s\)）\.]/gmi,
    
    // ページ境界を考慮
    /(?:^|\n)(?:---\s*ページ\s*\d+\s*---\s*)?(?:問題?\s*)?(\d+)[：。:\s\)）\.]/gm,
    
    // より柔軟な数字パターン
    /(?:^|\n)\s*(\d+)\s*[．。\)）\.]\s+(?=[^\d\s])/gm,
    /(?:^|\n)\s*(\d+)\s*[．。]\s+(?!\s*[abcdeアイウエオ])/gm,
    
    // 改行後の数字パターン（より厳密）
    /\n\s*(\d+)\s*[．。\)）\.]\s*(?![abcdeアイウエオ12345])/g,
    
    // 完全に独立した数字
    /(?<=\s|^)(\d+)\s*[．。\)）\.]\s+(?=\S)/g
  ]

  let questionBlocks: string[] = []
  let usedPattern: RegExp | null = null
  
  // 改良されたテキスト前処理
  const preprocessedText = cleanText
    .replace(/(\d+)\s*[．。]\s*([^0-9])/g, '$1. $2') // 数字の後の句読点を統一
    .replace(/(\d+)\s*\)\s*([^0-9])/g, '$1) $2') // 数字の後の括弧を統一
    .replace(/\n\s*\n/g, '\n') // 空行を削除
  
  // パターンで分割を試行
  for (const pattern of questionSplitPatterns) {
    pattern.lastIndex = 0 // グローバルフラグのリセット
    const matches = [...preprocessedText.matchAll(pattern)]
    console.log(`🔍 パターン ${pattern.source} で ${matches.length} 個のマッチ`)
    
    if (matches.length >= 1) { // 1問以上見つかった場合
      usedPattern = pattern
      
      // より正確な分割のため、マッチ位置を使用
      questionBlocks = []
      
      // ソート（開始位置順）
      matches.sort((a, b) => (a.index || 0) - (b.index || 0))
      
      matches.forEach((match, index) => {
        const startIndex = match.index!
        const nextMatch = matches[index + 1]
        const endIndex = nextMatch ? nextMatch.index! : preprocessedText.length
        
        let questionBlock = preprocessedText.substring(startIndex, endIndex).trim()
        
        // ページ境界マーカーを除去
        questionBlock = questionBlock.replace(/^---\s*ページ\s*\d+\s*---\s*/i, '')
        
        if (questionBlock.length > 15) { // 最小長制限
          questionBlocks.push(questionBlock)
        }
      })
      
      console.log(`📝 分割結果: ${questionBlocks.length} 個のブロック`)
      if (questionBlocks.length > 0) break
    }
  }

  // パターン分割に失敗した場合、改行ベースで分割を試行
  if (questionBlocks.length === 0) {
    console.log('📝 パターン分割失敗、改行ベースで分割を試行')
    const lines = preprocessedText.split(/\n+/).filter(line => line.trim().length > 5)
    
    // より厳密な数字開始パターン
    const questionStartPatterns = [
      /^\s*(\d+)\s*[．。\)\)\.]\s*/,
      /^\s*問題?\s*(\d+)[：。:\s]/,
      /^\s*Q\s*(\d+)[：。:\s]/i,
      /^\s*第?\s*(\d+)\s*問/,
      /^\s*No\.?\s*(\d+)/i
    ]
    
    let currentQuestion = ''
    const tempQuestions: string[] = []
    
    lines.forEach(line => {
      let isQuestionStart = false
      
      for (const pattern of questionStartPatterns) {
        if (pattern.test(line)) {
          isQuestionStart = true
          break
        }
      }
      
      if (isQuestionStart) {
        if (currentQuestion.trim().length > 15) {
          tempQuestions.push(currentQuestion.trim())
        }
        currentQuestion = line
      } else {
        if (currentQuestion || line.length > 10) { // コンテンツがある場合のみ追加
          currentQuestion += (currentQuestion ? ' ' : '') + line
        }
      }
    })
    
    if (currentQuestion.trim().length > 15) {
      tempQuestions.push(currentQuestion.trim())
    }
    
    if (tempQuestions.length > 0) {
      questionBlocks = tempQuestions
      console.log(`📝 改行ベース分割結果: ${questionBlocks.length} 個のブロック`)
    }
  }

  // まだ分割できない場合、より積極的な分割を試行
  if (questionBlocks.length === 0) {
    console.log('📝 積極的分割を試行')
    
    // 単純に一定の文字数で分割（最後の手段）
    const chunkSize = 500
    const chunks: string[] = []
    
    for (let i = 0; i < preprocessedText.length; i += chunkSize) {
      const chunk = preprocessedText.substring(i, i + chunkSize)
      if (chunk.trim().length > 50) {
        chunks.push(chunk.trim())
      }
    }
    
    if (chunks.length > 0) {
      questionBlocks = chunks
      console.log(`📝 チャンク分割結果: ${questionBlocks.length} 個のブロック`)
    }
  }

  // まだ分割できない場合、テキスト全体を1つの問題として扱う
  if (questionBlocks.length === 0) {
    console.log('📝 すべての分割方法が失敗、全体を1問として処理')
    questionBlocks = [preprocessedText]
  }

  // 各ブロックを問題として解析
  questionBlocks.forEach((block, index) => {
    console.log(`🔍 ブロック ${index + 1} を解析中: ${block.substring(0, 50)}...`)
    
    try {
      const question = parseQuestionBlock(block, index + 1)
      if (question) {
        questions.push(question)
        console.log(`✅ 問題 ${index + 1} 解析成功`)
      } else {
        console.log(`❌ 問題 ${index + 1} 解析失敗`)
      }
    } catch (err) {
      console.warn(`⚠️ 問題 ${index + 1} のパース中にエラー:`, err)
    }
  })

  console.log(`📊 最終結果: ${questions.length} 問を抽出`)
  return questions
}

function parseQuestionBlock(block: string, questionNumber: number): Question | null {
  console.log(`🔍 問題ブロック解析開始 (${questionNumber}): ${block.substring(0, 100)}...`)
  
  // 問題文と選択肢を分離
  let questionText = block
  let options: Record<string, string> = {}

  // より包括的な選択肢のパターン
  const optionPatterns = [
    // 数字選択肢（1-5, 1-4等）
    /([1-5])[．。\)\s]*([^\n\r1-5]{3,200}?)(?=[1-5][．。\)\s]|$)/g,
    // カタカナ選択肢（ア-オ）
    /([ア-オ])[．。\)\s]*([^\n\rア-オ]{3,200}?)(?=[ア-オ][．。\)\s]|$)/g,
    // 英字小文字選択肢（a-e）
    /([abcde])[．。\)\s]*([^\n\rabcde]{3,200}?)(?=[abcde][．。\)\s]|$)/gi,
    // 英字大文字選択肢（A-E）
    /([ABCDE])[．。\)\s]*([^\n\rABCDE]{3,200}?)(?=[ABCDE][．。\)\s]|$)/g,
    // 括弧付き数字選択肢 (1) (2) etc
    /\(([1-5])\)\s*([^\n\r\(]{3,200}?)(?=\([1-5]\)|$)/g,
    // 全角括弧付き数字選択肢 （1）（2）etc
    /（([1-5])）\s*([^\n\r（]{3,200}?)(?=（[1-5]）|$)/g
  ]

  let foundPattern: RegExp | null = null
  let maxMatches = 0

  // 最も多くマッチするパターンを選択
  for (const pattern of optionPatterns) {
    const matches = [...block.matchAll(pattern)]
    console.log(`🔍 選択肢パターン ${pattern} で ${matches.length} 個のマッチ`)
    
    if (matches.length > maxMatches && matches.length >= 2) {
      maxMatches = matches.length
      foundPattern = pattern
      
      // 一時的にoptionsをリセット
      options = {}
      matches.forEach(match => {
        const [, key, value] = match
        if (value && value.trim().length > 2) {
          const cleanValue = value.trim()
            .replace(/^\s*[：。:\s]+/, '') // 先頭の区切り文字除去
            .replace(/\s+/g, ' ') // 連続スペース正規化
            .trim()
          
          if (cleanValue.length > 0) {
            options[key] = cleanValue
            console.log(`📝 選択肢 ${key}: ${cleanValue.substring(0, 50)}...`)
          }
        }
      })
    }
  }

  // 選択肢パターンマッチ後、問題文から選択肢部分を除去
  if (foundPattern && Object.keys(options).length > 0) {
    questionText = block.replace(foundPattern, '').trim()
    console.log(`📝 選択肢抽出後の問題文: ${questionText.substring(0, 100)}...`)
  }

  // 選択肢が見つからない場合、行ごとに詳細分析
  if (Object.keys(options).length === 0) {
    console.log('📝 行ごと詳細分析開始')
    const lines = block.split(/[\n\r]+/).filter(line => line.trim().length > 0)
    
    let questionLines: string[] = []
    let optionLines: string[] = []
    let inOptionsSection = false
    
    lines.forEach((line, idx) => {
      const trimmedLine = line.trim()
      
      // 選択肢らしき行を検出
      const optionMatch = trimmedLine.match(/^([1-5ア-オabcdeABCDE]|（?[1-5]）?)[．。\)\s]*(.+)/) ||
                         trimmedLine.match(/^\(([1-5])\)\s*(.+)/) ||
                         trimmedLine.match(/^（([1-5])）\s*(.+)/)
      
      if (optionMatch && optionMatch[2] && optionMatch[2].trim().length > 2) {
        inOptionsSection = true
        const key = optionMatch[1].replace(/[（）\(\)]/g, '') // 括弧除去
        const value = optionMatch[2].trim()
        options[key] = value
        optionLines.push(line)
        console.log(`📝 行分析選択肢 ${key}: ${value.substring(0, 30)}...`)
      } else if (!inOptionsSection) {
        questionLines.push(line)
      }
    })
    
    if (questionLines.length > 0) {
      questionText = questionLines.join(' ').trim()
    }
  }

  // 問題文のクリーニング（より包括的）
  questionText = questionText
    .replace(/^問題?\s*\d*[：。:\s]*/, '')
    .replace(/^第?\s*\d+\s*問[：。:\s]*/, '')
    .replace(/^Q\s*\d+[：。:\s]*/i, '')
    .replace(/^No\s*\.?\s*\d+[：。:\s]*/i, '')
    .replace(/正しいものを選べ[．。]?$/i, '')
    .replace(/適切なものを選べ[．。]?$/i, '')
    .replace(/次のうち正しいのはどれか[．。]?$/i, '')
    .replace(/どれか[．。]?$/i, '')
    .replace(/選択肢?[：。:\s]*$/i, '')
    .replace(/答え?[：。:\s]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  console.log(`📝 最終問題文: "${questionText}"`)
  console.log(`📝 選択肢数: ${Object.keys(options).length}`)
  console.log(`📝 選択肢内容:`, Object.entries(options).map(([k,v]) => `${k}:${v.substring(0,20)}...`))

  // 最小要件チェック（条件を緩和）
  if (questionText.length < 3) {
    console.log('❌ 問題文が短すぎます')
    return null
  }

  if (Object.keys(options).length < 2) {
    console.log('❌ 選択肢が不足しています')
    // デバッグ情報を追加
    console.log('🔍 ブロック全体を再確認:', block)
    return null
  }

  // 正解の推定（通常は1番目、または特定のパターンを検出）
  const correctAnswers = [Object.keys(options)[0]] // デフォルトで最初の選択肢

  const result = {
    question_text: questionText,
    options,
    correct_answers: correctAnswers,
    question_number: questionNumber
  }

  console.log('✅ 問題解析完了:', result)
  return result
}

function findPossibleQuestionIndicators(text: string): string[] {
  const indicators = []
  
  if (text.match(/問題?\s*\d+/g)) {
    indicators.push('問題番号パターン')
  }
  if (text.match(/[1-5][．。)\s]/g)) {
    indicators.push('数字選択肢パターン')
  }
  if (text.match(/[ア-オ][．。)\s]/g)) {
    indicators.push('カナ選択肢パターン')
  }
  if (text.match(/[abcde][．。)\s]/g)) {
    indicators.push('英字選択肢パターン')
  }
  
  return indicators
}
