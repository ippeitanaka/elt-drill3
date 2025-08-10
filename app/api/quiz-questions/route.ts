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
  // 注: クエリビルダーはミュータブルなため、各試行ごとに新しく構築する
  const idVariants: any[][] = []
  const numericIds = toNumericIds(setIds)
  const stringIds = toStringIds(setIds)
  if (Array.isArray(setIds) && setIds.length > 0) idVariants.push(setIds)
  if (numericIds.length > 0) idVariants.push(numericIds)
  if (stringIds.length > 0) idVariants.push(stringIds)

  // 安全な並び順から試す: question_number → id → created_at → (最後に) order_index
  const orderers: Array<(q: any) => any> = [
    (q: any) => q.order('question_number', { ascending: true }),
    (q: any) => q.order('id', { ascending: true }),
    (q: any) => q.order('created_at', { ascending: true }),
    (q: any) => q.order('order_index', { ascending: true }), // 環境により存在しない
    (q: any) => q,
  ]

  for (let b = 0; b < idVariants.length; b++) {
    for (let i = 0; i < orderers.length; i++) {
      try {
        let query = adminClient
          .from('questions')
          .select('*')
          .in('question_set_id', idVariants[b])
        query = orderers[i](query)
        if (limit && typeof query.limit === 'function') query = query.limit(limit)
        const { data, error } = await query
        if (!error && Array.isArray(data) && data.length > 0) return data
        if (error) console.warn(`Questions fetch variant ${b + 1} order ${i + 1} failed:`, error.message || error)
      } catch (e) {
        console.warn(`Questions fetch variant ${b + 1} order ${i + 1} threw:`, e)
      }
    }
  }

  // フォールバック: 各IDを個別に eq で取得して集約
  try {
    const ids = numericIds.length > 0 ? numericIds : (stringIds.length > 0 ? stringIds : setIds)
    const collected: any[] = []
    for (const id of ids) {
      try {
        let q = adminClient.from('questions').select('*').eq('question_set_id', id).order('question_number', { ascending: true })
        if (limit && typeof q.limit === 'function') q = q.limit(limit)
        const { data, error } = await q
        if (!error && Array.isArray(data) && data.length > 0) {
          collected.push(...data)
          if (limit && collected.length >= limit) break
        }
      } catch (e) {
        console.warn('eq fallback error for id', id, e)
      }
    }
    if (collected.length > 0) return collected.slice(0, limit || collected.length)
  } catch (e) {
    console.warn('eq fallback threw:', e)
  }

  return []
}

// 追加: カテゴリーIDで直接検索するフォールバック
async function fetchQuestionsByCategoryIds(adminClient: any, categoryIds: any[], limit?: number) {
  const idVariants: any[][] = []
  const numericIds = toNumericIds(categoryIds)
  const stringIds = toStringIds(categoryIds)
  if (Array.isArray(categoryIds) && categoryIds.length > 0) idVariants.push(categoryIds)
  if (numericIds.length > 0) idVariants.push(numericIds)
  if (stringIds.length > 0) idVariants.push(stringIds)

  const orderers: Array<(q: any) => any> = [
    (q: any) => q.order('question_number', { ascending: true }),
    (q: any) => q.order('id', { ascending: true }),
    (q: any) => q.order('created_at', { ascending: true }),
    (q: any) => q,
  ]

  for (let b = 0; b < idVariants.length; b++) {
    for (let i = 0; i < orderers.length; i++) {
      try {
        let query = adminClient
          .from('questions')
          .select('*')
          .in('category_id', idVariants[b])
        query = orderers[i](query)
        if (limit && typeof query.limit === 'function') query = query.limit(limit)
        const { data, error } = await query
        if (!error && Array.isArray(data) && data.length > 0) return data
        if (error) console.warn(`Questions by category variant ${b + 1} order ${i + 1} failed:`, error.message || error)
      } catch (e) {
        console.warn(`Questions by category variant ${b + 1} order ${i + 1} threw:`, e)
      }
    }
  }

  // 単一カテゴリごとの eq フォールバック
  try {
    const ids = numericIds.length > 0 ? numericIds : (stringIds.length > 0 ? stringIds : categoryIds)
    const collected: any[] = []
    for (const id of ids) {
      try {
        let q = adminClient.from('questions').select('*').eq('category_id', id).order('question_number', { ascending: true })
        if (limit && typeof q.limit === 'function') q = q.limit(limit)
        const { data, error } = await q
        if (!error && Array.isArray(data) && data.length > 0) {
          collected.push(...data)
          if (limit && collected.length >= limit) break
        }
      } catch (e) {
        console.warn('category eq fallback error for id', id, e)
      }
    }
    if (collected.length > 0) return collected.slice(0, limit || collected.length)
  } catch (e) {
    console.warn('category eq fallback threw:', e)
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
      // セットで見つからない場合は、選択カテゴリーから直接取得
      if (questions.length === 0 && selectedCategories && selectedCategories.length > 0) {
        questions = await fetchQuestionsByCategoryIds(adminClient, selectedCategories, questionCount)
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

      // セット経由で取得できなかった場合のフォールバック
      if (questions.length === 0) {
        questions = await fetchQuestionsByCategoryIds(adminClient, selectedCategories, questionCount)
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
      // セットが見つからない場合、カテゴリIDで直接取得
      const questions = await fetchQuestionsByCategoryIds(adminClient, [categoryIdRaw], limit)
      return NextResponse.json({ success: true, data: questions })
    }

    const questions = await fetchQuestionsBySetIds(adminClient, questionSetIds, limit)

    // セット経由で空ならカテゴリ直取得
    if (!questions || questions.length === 0) {
      const fallback = await fetchQuestionsByCategoryIds(adminClient, [categoryIdRaw], limit)
      return NextResponse.json({ success: true, data: fallback })
    }

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
