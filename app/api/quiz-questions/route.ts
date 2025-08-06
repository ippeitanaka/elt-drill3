import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    const body = await request.json()
    
    const { selectedCategories, selectedSets, questionCount = 1000 } = body

    console.log('Quiz questions API: データ取得開始', {
      selectedCategories,
      selectedSets,
      questionCount
    })

    let questions = []

    if (selectedSets && selectedSets.length > 0) {
      // 特定の問題セットから取得（制限なし）
      const { data, error } = await adminClient
        .from('questions')
        .select('*')
        .in('question_set_id', selectedSets)
        .order('question_number', { ascending: true })

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
          .order('question_number', { ascending: true })

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

export async function GET(request: NextRequest) {
  try {
    const adminClient = createServerClient()
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

    // カテゴリーから問題セット経由で取得
    const { data: questionSets, error: setsError } = await adminClient
      .from('question_sets')
      .select('id')
      .eq('category_id', parseInt(categoryId))

    if (setsError) {
      console.error('Question sets error:', setsError)
      throw setsError
    }

    const questionSetIds = questionSets?.map(qs => qs.id) || []
    
    if (questionSetIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const { data: questions, error } = await adminClient
      .from('questions')
      .select('*')
      .in('question_set_id', questionSetIds)
      .order('question_number', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Questions error:', error)
      throw error
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
