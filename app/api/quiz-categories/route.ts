import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    
    console.log('Quiz categories API: データ取得開始')
    
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
        { error: categoriesError.message },
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
          total_questions: count
        }
      })
    )

    console.log('Quiz categories API: 結果', {
      categories: categoriesWithQuestionCounts.length,
      questionSets: Object.keys(groupedSets).length
    })

    return NextResponse.json({
      success: true,
      data: {
        categories: categoriesWithQuestionCounts,
        questionSets: groupedSets
      }
    })

  } catch (error: any) {
    console.error('Quiz categories API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
