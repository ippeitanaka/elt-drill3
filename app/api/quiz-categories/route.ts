import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getSupabaseClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // 環境変数未設定時はローカル開発用のモックカテゴリを返す
    const hasPublic = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!hasPublic) {
      const mock = [
        { id: 'demo-1', name: '基礎医学', total_questions: 25, avg_difficulty: 2 },
        { id: 'demo-2', name: '解剖生理', total_questions: 40, avg_difficulty: 3 },
        { id: 'demo-3', name: '救急処置', total_questions: 32, avg_difficulty: 4 },
        { id: 'demo-4', name: '法律・倫理', total_questions: 18, avg_difficulty: 1 },
      ]
      return NextResponse.json({
        success: true,
        mode: 'mock',
        data: { categories: mock, questionSets: {} }
      })
    }

    // サービスロールキーが未設定の場合は anon クライアントにフォールバック
    let adminClient: any
    let limited = false
    try {
      adminClient = createServerClient()
    } catch (e) {
      console.warn('Quiz categories API: service role not configured, falling back to anon client (categories only)')
      adminClient = getSupabaseClient()
      limited = true
    }

    const debug = request.nextUrl.searchParams.get('debug') === '1'
    console.log('Quiz categories API: データ取得開始')

    if (limited) {
      // フォールバック: カテゴリー一覧（id, name のみ）を返す
      const { data: categoriesOnly, error: categoriesOnlyError } = await adminClient
        .from('categories')
        .select('id, name')
        .order('id')

      if (categoriesOnlyError) {
        console.error('Categories API (fallback) error:', categoriesOnlyError)
        return NextResponse.json(
          { success: false, error: categoriesOnlyError.message },
          { status: 500 }
        )
      }

      console.log('Quiz categories API (fallback): 結果', { categories: categoriesOnly?.length || 0 })
      return NextResponse.json({
        success: true,
        mode: 'anon',
        ...(debug ? { envSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL } : {}),
        data: {
          categories: categoriesOnly || [],
          questionSets: {}
        }
      })
    }

    // カテゴリーを取得（管理用APIと同じ方式）
    const { data: categoriesData, error: categoriesError } = await adminClient
      .from('categories')
      .select(`
        *,
        question_sets(count)
      `)
      .order('id')

    if (categoriesError) {
      console.error('Categories API error:', categoriesError)
      return NextResponse.json(
        { success: false, error: categoriesError.message },
        { status: 500 }
      )
    }

    // 問題セットを取得（order_indexカラムがない場合はcreated_atでソート）
    const { data: setsData, error: setsError } = await adminClient
      .from('question_sets')
      .select('*')
      .order('created_at', { ascending: true })

    if (setsError) {
      console.error('Question sets API error:', setsError)
      // 問題セットテーブルが存在しない場合は空の配列を返す
      console.log('問題セットが存在しないため、空のデータを返します')
    }

    // 問題セットをカテゴリー別にグループ化
    const groupedSets: Record<string, any[]> = {}
    if (setsData) {
      setsData.forEach((set: any) => {
        if (!groupedSets[set.category_id]) {
          groupedSets[set.category_id] = []
        }
        groupedSets[set.category_id].push(set)
      })
    }

    // 各カテゴリーの問題数を計算
    const categoriesWithQuestionCounts = await Promise.all(
      (categoriesData || []).map(async (category: any) => {
        const questionSetIds = groupedSets[category.id]?.map((set: any) => set.id) || []
        
        let count = 0
        if (questionSetIds.length > 0) {
          const { count: questionCount, error: countError } = await adminClient
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .in('question_set_id', questionSetIds)
          
          if (!countError) {
            count = questionCount || 0
          }
        }
        
        return {
          ...category,
          total_questions: count,
          avg_difficulty: category.avg_difficulty ?? 3,
        }
      })
    )

    console.log('Quiz categories API: 結果', {
      categories: categoriesWithQuestionCounts.length,
      questionSets: Object.keys(groupedSets).length
    })

    return NextResponse.json({
      success: true,
      mode: 'service',
      ...(debug ? { envSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL } : {}),
      data: {
        categories: categoriesWithQuestionCounts,
        questionSets: groupedSets
      }
    })

  } catch (error: any) {
    console.error('Quiz categories API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
