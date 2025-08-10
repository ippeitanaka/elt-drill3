import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getSupabaseClient } from '@/lib/supabase'

async function fetchQuestionsBySetIds(adminClient: any, setIds: any[], limit?: number) {
  // order_index → question_number → id → 無指定 の順でフォールバック
  const base = adminClient.from('questions').select('*').in('question_set_id', setIds)
  const tries = [
    (q: any) => q.order('order_index', { ascending: true }),
    (q: any) => q.order('question_number', { ascending: true }),
    (q: any) => q.order('id', { ascending: true }),
    (q: any) => q, // 最後は順序指定なし
  ]

  for (let i = 0; i < tries.length; i++) {
    try {
      let query = tries[i](base)
      if (limit && typeof query.limit === 'function') {
        query = query.limit(limit)
      }
      const { data, error } = await query
      if (!error) return data || []
      console.warn(`Questions fetch attempt ${i + 1} failed:`, error)
    } catch (e) {
      console.warn(`Questions fetch attempt ${i + 1} threw error:`, e)
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
    } else if (selectedCategories && selectedCategories.length > 0) {
      const { data: questionSets, error: setsError } = await adminClient
        .from('question_sets')
        .select('id')
        .in('category_id', selectedCategories)

      if (setsError) {
        console.error('Question sets error:', setsError)
        throw setsError
      }

      const questionSetIds = questionSets?.map((qs: any) => qs.id) || []
      
      if (questionSetIds.length > 0) {
        questions = await fetchQuestionsBySetIds(adminClient, questionSetIds, questionCount)
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
    
    const categoryId = searchParams.get('categoryId')
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log('Quiz questions GET API:', { categoryId, limit })

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const { data: questionSets, error: setsError } = await adminClient
      .from('question_sets')
      .select('id')
      .eq('category_id', categoryId)

    if (setsError) {
      console.error('Question sets error:', setsError)
      throw setsError
    }

    const questionSetIds = questionSets?.map((qs: any) => qs.id) || []
    
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
