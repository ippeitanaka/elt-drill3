import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    // 各テーブルの実際のデータを確認
    const { data: categories, count: categoriesCount } = await adminClient
      .from('categories')
      .select('*', { count: 'exact' })
    
    const { data: questionSets, count: questionSetsCount } = await adminClient
      .from('question_sets')
      .select('*', { count: 'exact' })
    
    const { data: questions, count: questionsCount } = await adminClient
      .from('questions')
      .select('*', { count: 'exact' })
    
    return NextResponse.json({
      success: true,
      message: '✅ 救急救命士国家試験データベースの最終状況',
      summary: {
        categories: categoriesCount || 0,
        question_sets: questionSetsCount || 0, 
        questions: questionsCount || 0
      },
      data: {
        categories: categories?.map(c => ({ id: c.id, name: c.name })) || [],
        question_sets: questionSets?.map(qs => ({ 
          id: qs.id, 
          name: qs.name, 
          category_id: qs.category_id 
        })) || [],
        questions_sample: questions?.slice(0, 3).map(q => ({ 
          id: q.id, 
          question_text: q.question_text.substring(0, 50) + '...', 
          question_set_id: q.question_set_id 
        })) || []
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
