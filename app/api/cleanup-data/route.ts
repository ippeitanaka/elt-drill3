import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    
    console.log('🗑️ データベースクリーンアップを開始します...')
    
    // 現在の問題数を確認
    const { count: questionsCount } = await adminClient
      .from('questions')
      .select('*', { count: 'exact', head: true })
    
    const { count: questionSetsCount } = await adminClient
      .from('question_sets')
      .select('*', { count: 'exact', head: true })
    
    console.log(`削除前: questions ${questionsCount}件, question_sets ${questionSetsCount}件`)
    
    // 1. 問題を削除
    const { error: questionsError } = await adminClient
      .from('questions')
      .delete()
      .neq('id', 0) // 全て削除
    
    if (questionsError) {
      console.error('問題削除エラー:', questionsError)
      throw questionsError
    }
    
    console.log('✅ 全ての問題を削除しました')
    
    // 2. 問題セットを削除
    const { error: questionSetsError } = await adminClient
      .from('question_sets')
      .delete()
      .neq('id', 0) // 全て削除
    
    if (questionSetsError) {
      console.error('問題セット削除エラー:', questionSetsError)
      throw questionSetsError
    }
    
    console.log('✅ 全ての問題セットを削除しました')
    
    // 削除後の確認
    const { count: finalQuestionsCount } = await adminClient
      .from('questions')
      .select('*', { count: 'exact', head: true })
    
    const { count: finalQuestionSetsCount } = await adminClient
      .from('question_sets')
      .select('*', { count: 'exact', head: true })
    
    console.log(`削除後: questions ${finalQuestionsCount}件, question_sets ${finalQuestionSetsCount}件`)
    
    return NextResponse.json({
      success: true,
      message: 'データベースクリーンアップが完了しました',
      deleted: {
        questions: questionsCount || 0,
        questionSets: questionSetsCount || 0
      },
      remaining: {
        questions: finalQuestionsCount || 0,
        questionSets: finalQuestionSetsCount || 0
      }
    })

  } catch (error: any) {
    console.error('🚨 データベースクリーンアップエラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'データベースクリーンアップでエラーが発生しました'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    // 現在のデータ状況を確認
    const { count: questionsCount } = await adminClient
      .from('questions')
      .select('*', { count: 'exact', head: true })
    
    const { count: questionSetsCount } = await adminClient
      .from('question_sets')
      .select('*', { count: 'exact', head: true })
    
    const { data: categories } = await adminClient
      .from('categories')
      .select('id, name')
    
    return NextResponse.json({
      success: true,
      currentData: {
        questions: questionsCount || 0,
        questionSets: questionSetsCount || 0,
        categories: categories?.length || 0
      },
      message: questionsCount === 0 ? 'データベースはクリーンです' : `${questionsCount}問のデータがあります`
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
