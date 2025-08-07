import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
  
  // 問題の境界を示すパターン
  const questionPatterns = [
    /問題?\s*(\d+)[．。:\s]/g,
    /第?\s*(\d+)\s*問[．。:\s]/g,
    /(\d+)[．。]\s*(?!選択)/g,
    /Q\s*(\d+)[．。:\s]/gi
  ]

  // テキストを正規化
  const normalizedText = text
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .trim()

  // 問題番号で分割を試行
  let questionBlocks: string[] = []
  
  for (const pattern of questionPatterns) {
    const matches = [...normalizedText.matchAll(pattern)]
    if (matches.length > 0) {
      // 問題番号で分割
      const splits = normalizedText.split(pattern)
      if (splits.length > 1) {
        questionBlocks = splits.slice(1) // 最初の空の部分を除去
        break
      }
    }
  }

  // 分割できなかった場合は段落で分割
  if (questionBlocks.length === 0) {
    questionBlocks = normalizedText.split(/\n\s*\n/).filter(block => block.trim().length > 50)
  }

  for (let i = 0; i < questionBlocks.length && questions.length < 50; i++) {
    const block = questionBlocks[i].trim()
    if (block.length < 20) continue

    try {
      const question = parseQuestionBlock(block, i + 1)
      if (question) {
        questions.push(question)
      }
    } catch (err) {
      console.warn(`⚠️ 問題 ${i + 1} のパース中にエラー:`, err)
    }
  }

  return questions
}

function parseQuestionBlock(block: string, questionNumber: number): Question | null {
  // 選択肢のパターン
  const optionPatterns = [
    /([1-5])[．。)\s]*([^1-5\n]{1,200}?)(?=[1-5][．。)\s]|$)/g,
    /([ア-オ])[．。)\s]*([^ア-オ\n]{1,200}?)(?=[ア-オ][．。)\s]|$)/g,
    /([abcde])[．。)\s]*([^abcde\n]{1,200}?)(?=[abcde][．。)\s]|$)/g,
    /([ABCDE])[．。)\s]*([^ABCDE\n]{1,200}?)(?=[ABCDE][．。)\s]|$)/g
  ]

  let options: Record<string, string> = {}
  let questionText = block

  // 選択肢を抽出
  for (const pattern of optionPatterns) {
    const matches = [...block.matchAll(pattern)]
    if (matches.length >= 2) {
      matches.forEach(match => {
        const [, key, value] = match
        if (value && value.trim().length > 0) {
          options[key] = value.trim()
        }
      })

      // 問題文から選択肢部分を除去
      questionText = block.replace(pattern, '').trim()
      break
    }
  }

  // 選択肢が見つからない場合、シンプルな数字パターンを試行
  if (Object.keys(options).length === 0) {
    const simpleMatches = block.match(/[1-5][．。\s][^1-5]{10,100}/g)
    if (simpleMatches && simpleMatches.length >= 2) {
      simpleMatches.forEach((match, idx) => {
        const key = (idx + 1).toString()
        const value = match.replace(/^[1-5][．。\s]/, '').trim()
        if (value.length > 0) {
          options[key] = value
        }
      })
      questionText = block.replace(/[1-5][．。\s][^1-5]{10,100}/g, '').trim()
    }
  }

  // 問題文のクリーニング
  questionText = questionText
    .replace(/^問題?\s*\d*[．。:\s]*/, '')
    .replace(/^第?\s*\d+\s*問[．。:\s]*/, '')
    .replace(/^Q\s*\d+[．。:\s]*/i, '')
    .replace(/正しいものを選べ[．。]?$/i, '')
    .replace(/適切なものを選べ[．。]?$/i, '')
    .replace(/次のうち正しいのはどれか[．。]?$/i, '')
    .trim()

  // 最小要件チェック
  if (questionText.length < 10 || Object.keys(options).length < 2) {
    return null
  }

  // 正解の推定（通常は1番目、または特定のパターンを検出）
  const correctAnswers = [Object.keys(options)[0]] // デフォルトで最初の選択肢

  return {
    question_text: questionText,
    options,
    correct_answers: correctAnswers,
    question_number: questionNumber
  }
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
