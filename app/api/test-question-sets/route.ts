import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const adminClient = createServerClient()
    
    // テスト用のquestion_setを1つ作成してスキーマを確認
    const { data: testQuestionSet, error: testError } = await adminClient
      .from('question_sets')
      .insert([{ 
        category_id: 19,  // 心肺蘇生法のカテゴリーID
        name: 'テスト問題セット'
      }])
      .select()
    
    if (testError) {
      return NextResponse.json({
        success: false,
        error: `question_sets テストエラー: ${testError.message}`,
        hint: 'question_setsテーブルの必要なフィールドが分からない可能性があります'
      }, { status: 500 })
    }
    
    // スキーマ確認のために削除はしない
    
    return NextResponse.json({
      success: true,
      message: 'question_setsのスキーマを確認しました（削除していません）',
      schema: testQuestionSet?.[0] ? Object.keys(testQuestionSet[0]) : [],
      sample: testQuestionSet?.[0] || null
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
