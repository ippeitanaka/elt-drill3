import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    // 既存データからスキーマを推測
    const { data: categories } = await adminClient.from('categories').select('*').limit(5)
    const { data: questionSets } = await adminClient.from('question_sets').select('*').limit(1)
    const { data: questions } = await adminClient.from('questions').select('*').limit(1)
    
    return NextResponse.json({
      success: true,
      message: '既存データからスキーマを推測しました',
      sample_data: {
        categories: categories || [],
        question_sets: questionSets || [],
        questions: questions || []
      },
      schema_info: {
        categories_columns: categories?.[0] ? Object.keys(categories[0]) : [],
        question_sets_columns: questionSets?.[0] ? Object.keys(questionSets[0]) : [],
        questions_columns: questions?.[0] ? Object.keys(questions[0]) : []
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
