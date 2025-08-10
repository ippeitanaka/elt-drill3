import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getSupabaseClient } from '@/lib/supabase'

function toNumericIds(ids: any[] | undefined): number[] {
  if (!Array.isArray(ids)) return []
  const nums = ids
    .map((v) => {
      if (v === null || v === undefined) return NaN
      const s = String(v).trim()
      if (/^\d+$/.test(s)) return Number(s)
      return NaN
    })
    .filter((n) => !Number.isNaN(n)) as number[]
  return nums
}

function toStringIds(ids: any[] | undefined): string[] {
  if (!Array.isArray(ids)) return []
  return ids.map((v) => (v === null || v === undefined ? '' : String(v).trim()))
}

async function fetchQuestionsBySetIds(adminClient: any, setIds: any[], limit?: number) {
  // order_index → question_number → id → 無指定 の順でフォールバック
  const numericIds = toNumericIds(setIds)
  const stringIds = toStringIds(setIds)
  const bases = [
    adminClient.from('questions').select('*').in('question_set_id', setIds),
    ...(numericIds.length > 0
      ? [adminClient.from('questions').select('*').in('question_set_id', numericIds)]
      : []),
    ...(stringIds.length > 0
      ? [adminClient.from('questions').select('*').in('question_set_id', stringIds)]
      : []),
  ]
  const orderTries = [
    (q: any) => q.order('order_index', { ascending: true }),
    (q: any) => q.order('question_number', { ascending: true }),
    (q: any) => q.order('id', { ascending: true }),
    (q: any) => q, // 最後は順序指定なし
  ]

  for (let b = 0; b < bases.length; b++) {
    for (let i = 0; i < orderTries.length; i++) {
      try {
        let query = orderTries[i](bases[b])
        if (limit && typeof query.limit === 'function') {
          query = query.limit(limit)
        }
        const { data, error } = await query
        if (!error && Array.isArray(data) && data.length > 0) return data
        if (error) console.warn(`Questions fetch base ${b + 1} attempt ${i + 1} failed:`, error)
      } catch (e) {
        console.warn(`Questions fetch base ${b + 1} attempt ${i + 1} threw error:`, e)
      }
    }
  }
  return []
}

export async function POST(request: NextRequest) {
  try {
    // サービスロールが無い環境でも応答できるようにフォールバック
    let adminClient: any
    try {
      adminClient = createServerClient()
    } catch (e) {
      console.warn('quiz-questions POST: service role not configured, falling back to anon client')
      adminClient = getSupabaseClient()
    }

    const body = await request.json()
    
    const { selectedCategories, selectedSets, questionCount = 500 } = body

    console.log('Quiz questions API: データ取得開始', {
      selectedCategories,
      selectedSets,
      questionCount
    })

    let questions: any[] = []

    if (selectedSets && selectedSets.length > 0) {
      questions = await fetchQuestionsBySetIds(adminClient, selectedSets, questionCount)
      if (questions.length === 0) {
        const numericSetIds = toNumericIds(selectedSets)
        if (numericSetIds.length > 0) {
          questions = await fetchQuestionsBySetIds(adminClient, numericSetIds as any, questionCount)
        }
      }
      if (questions.length === 0) {
        const stringSetIds = toStringIds(selectedSets)
        if (stringSetIds.length > 0) {
          questions = await fetchQuestionsBySetIds(adminClient, stringSetIds as any, questionCount)
        }
      }
    } else if (selectedCategories && selectedCategories.length > 0) {
      // カテゴリー→セットID 取得（型フォールバック）
      let questionSetsIds: any[] = []
      const tryIdsList: any[][] = [selectedCategories]
      const numericCatIds = toNumericIds(selectedCategories)
      const stringCatIds = toStringIds(selectedCategories)
      if (numericCatIds.length > 0) tryIdsList.push(numericCatIds as any)
      if (stringCatIds.length > 0) tryIdsList.push(stringCatIds as any)

      for (let t = 0; t < tryIdsList.length; t++) {
        const ids = tryIdsList[t]
        try {
          const { data: questionSets, error: setsError } = await adminClient
            .from('question_sets')
            .select('id')
            .in('category_id', ids)

          if (!setsError && Array.isArray(questionSets) && questionSets.length > 0) {
            questionSetsIds = questionSets.map((qs: any) => qs.id)
            break
          }
          if (setsError) console.warn(`question_sets by categories attempt ${t + 1} failed:`, setsError)
        } catch (e) {
          console.warn(`question_sets by categories attempt ${t + 1} threw error:`, e)
        }
      }

      if (questionSetsIds.length > 0) {
        questions = await fetchQuestionsBySetIds(adminClient, questionSetsIds, questionCount)
        if (questions.length === 0) {
          const numericSetIds = toNumericIds(questionSetsIds)
          if (numericSetIds.length > 0) {
            questions = await fetchQuestionsBySetIds(adminClient, numericSetIds as any, questionCount)
          }
        }
        if (questions.length === 0) {
          const stringSetIds = toStringIds(questionSetsIds)
          if (stringSetIds.length > 0) {
            questions = await fetchQuestionsBySetIds(adminClient, stringSetIds as any, questionCount)
          }
        }
      }
    }

    console.log('Quiz questions API: 取得完了', {
      questionsCount: questions.length
    })

    return NextResponse.json({
      success: true,
      data: questions
    })

  } catch (error: any) {
    console.error('Quiz questions API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // サービスロールが無い環境でも応答できるようにフォールバック
    let adminClient: any
    try {
      adminClient = createServerClient()
    } catch (e) {
      console.warn('quiz-questions GET: service role not configured, falling back to anon client')
      adminClient = getSupabaseClient()
    }

    const { searchParams } = new URL(request.url)
    
    const categoryIdRaw = searchParams.get('categoryId')
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log('Quiz questions GET API:', { categoryId: categoryIdRaw, limit })

    if (!categoryIdRaw) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const tryIds: any[] = [categoryIdRaw]
    if (/^\d+$/.test(categoryIdRaw)) tryIds.push(Number(categoryIdRaw))
    tryIds.push(String(categoryIdRaw))

    let questionSetIds: any[] = []
    for (let i = 0; i < tryIds.length; i++) {
      try {
        const { data: questionSets, error: setsError } = await adminClient
          .from('question_sets')
          .select('id')
          .eq('category_id', tryIds[i])
        if (!setsError && Array.isArray(questionSets) && questionSets.length > 0) {
          questionSetIds = questionSets.map((qs: any) => qs.id)
          break
        }
        if (setsError) console.warn(`question_sets by category eq attempt ${i + 1} failed:`, setsError)
      } catch (e) {
        console.warn(`question_sets by category eq attempt ${i + 1} threw error:`, e)
      }
    }

    if (questionSetIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const questions = await fetchQuestionsBySetIds(adminClient, questionSetIds, limit)

    console.log('取得した問題数:', questions?.length || 0)

    return NextResponse.json({
      success: true,
      data: questions || []
    })

  } catch (error: any) {
    console.error('Quiz questions GET API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
