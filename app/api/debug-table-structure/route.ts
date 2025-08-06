import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    
    console.log('🔍 テーブル構造とデータを調査中...')
    
    // 1. questions テーブルの構造確認
    const { data: questionsInfo, error: questionsError } = await adminClient
      .from('questions')
      .select('*')
      .limit(1)
    
    console.log('questions テーブル サンプル:', questionsInfo)
    if (questionsError) console.log('questions エラー:', questionsError)
    
    // 2. question_sets テーブルの確認
    const { data: questionSets, error: setsError } = await adminClient
      .from('question_sets')
      .select('*')
    
    console.log('question_sets テーブル:', questionSets)
    if (setsError) console.log('question_sets エラー:', setsError)
    
    // 3. categories テーブルの確認
    const { data: categories, error: categoriesError } = await adminClient
      .from('categories')
      .select('*')
    
    console.log('categories テーブル:', categories)
    if (categoriesError) console.log('categories エラー:', categoriesError)
    
    // 4. 実際の問題数カウント
    const { count: questionsCount, error: countError } = await adminClient
      .from('questions')
      .select('*', { count: 'exact', head: true })
    
    console.log('実際の questions 数:', questionsCount)
    if (countError) console.log('カウントエラー:', countError)
    
    // 5. 最近の question 挿入履歴
    const { data: recentQuestions, error: recentError } = await adminClient
      .from('questions')
      .select('id, question_set_id, question_number, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('最近の questions:', recentQuestions)
    if (recentError) console.log('最近の questions エラー:', recentError)

    return NextResponse.json({
      success: true,
      data: {
        questionsInfo,
        questionSets,
        categories,
        questionsCount,
        recentQuestions,
        timestamp: new Date().toISOString()
      },
      errors: {
        questionsError,
        setsError,
        categoriesError,
        countError,
        recentError
      }
    })

  } catch (error: any) {
    console.error('🚨 デバッグAPI エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'テーブル構造調査でエラーが発生しました'
    }, { status: 500 })
  }
}
