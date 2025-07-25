import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    
    // カテゴリーの情報を取得
    const { data: categories, error: categoriesError } = await adminClient
      .from('categories')
      .select('*')
      .order('name')
    
    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 })
    }

    // 問題セットの情報を取得
    const { data: questionSets, error: setsError } = await adminClient
      .from('question_sets')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (setsError) {
      return NextResponse.json({ error: setsError.message }, { status: 500 })
    }

    // 問題の情報を取得
    const { data: questions, error: questionsError } = await adminClient
      .from('questions')
      .select('id, question_text, category_id, question_set_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 })
    }

    // カテゴリー別の問題数を集計
    const categoryStats = await Promise.all(
      categories.map(async (category) => {
        const { count } = await adminClient
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id)
        
        return {
          ...category,
          actual_question_count: count
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        categories: categoryStats,
        questionSets,
        recentQuestions: questions,
        summary: {
          totalCategories: categories.length,
          totalQuestionSets: questionSets.length,
          totalQuestions: questions.length
        }
      }
    })

  } catch (error: any) {
    console.error('Debug API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
