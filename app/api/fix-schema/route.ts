import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    
    // まず現在のテーブル構造を確認
    const { data: existingQuestions, error: selectError } = await adminClient
      .from('questions')
      .select('id, question_set_id')
      .limit(1)
    
    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }

    // question_setsからcategory_idを取得して各questionを更新する方法を使用
    const { data: questionSets, error: setsError } = await adminClient
      .from('question_sets')
      .select('id, category_id')
    
    if (setsError) {
      return NextResponse.json({ error: setsError.message }, { status: 500 })
    }

    // すべての問題を取得
    const { data: allQuestions, error: questionsError } = await adminClient
      .from('questions')
      .select('id, question_set_id')
    
    if (questionsError) {
      return NextResponse.json({ error: questionsError.message }, { status: 500 })
    }

    // 問題ごとにcategory_idを設定
    const updates = []
    for (const question of allQuestions || []) {
      const questionSet = questionSets?.find(qs => qs.id === question.question_set_id)
      if (questionSet) {
        const { error: updateError } = await adminClient
          .from('questions')
          .update({ category_id: questionSet.category_id })
          .eq('id', question.id)
        
        if (updateError) {
          console.error(`Failed to update question ${question.id}:`, updateError)
        } else {
          updates.push({ questionId: question.id, categoryId: questionSet.category_id })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} questions with category_id`,
      updates: updates.slice(0, 10) // 最初の10件のみ表示
    })

  } catch (error: any) {
    console.error('Schema update error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
