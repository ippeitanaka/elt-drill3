import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    const body = await request.json()
    
    const { selectedCategories, selectedSets, questionCount = 20 } = body

    console.log('Quiz questions API: データ取得開始', {
      selectedCategories,
      selectedSets,
      questionCount
    })

    let questions = []

    if (selectedSets && selectedSets.length > 0) {
      // 特定の問題セットから取得
      const { data, error } = await adminClient
        .from('questions')
        .select('*')
        .in('question_set_id', selectedSets)
        .order('order_index', { ascending: true })
        .limit(questionCount)

      if (error) {
        console.error('Questions by sets error:', error)
        throw error
      }
      questions = data || []
    } else if (selectedCategories && selectedCategories.length > 0) {
      // カテゴリーから問題セット経由で取得
      const { data: questionSets, error: setsError } = await adminClient
        .from('question_sets')
        .select('id')
        .in('category_id', selectedCategories)

      if (setsError) {
        console.error('Question sets error:', setsError)
        throw setsError
      }

      const questionSetIds = questionSets?.map(qs => qs.id) || []
      
      if (questionSetIds.length > 0) {
        const { data, error } = await adminClient
          .from('questions')
          .select('*')
          .in('question_set_id', questionSetIds)
          .order('order_index', { ascending: true })
          .limit(questionCount)

        if (error) {
          console.error('Questions by categories error:', error)
          throw error
        }
        questions = data || []
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
