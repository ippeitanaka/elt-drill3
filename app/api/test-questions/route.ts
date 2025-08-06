import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const adminClient = createServerClient()
    
    // テスト用のquestionを1つ作成してスキーマを確認
    const { data: testQuestion, error: testError } = await adminClient
      .from('questions')
      .insert([{ 
        question_set_id: 4,  // 存在するテスト問題セット
        question_text: 'テスト問題'
      }])
      .select()
    
    if (testError) {
      return NextResponse.json({
        success: false,
        error: `questions テストエラー: ${testError.message}`,
        hint: 'questionsテーブルの必要なフィールドが分からない可能性があります'
      }, { status: 500 })
    }
    
    // テストquestionを削除
    if (testQuestion && testQuestion.length > 0) {
      await adminClient
        .from('questions')
        .delete()
        .eq('id', testQuestion[0].id)
    }
    
    return NextResponse.json({
      success: true,
      message: 'questionsのスキーマを確認しました',
      schema: testQuestion?.[0] ? Object.keys(testQuestion[0]) : [],
      sample: testQuestion?.[0] || null
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
