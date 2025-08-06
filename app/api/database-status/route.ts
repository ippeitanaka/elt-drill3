import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    
    // データベース接続確認
    console.log('データベース診断を開始します...')
    
    // 1. テーブル一覧の確認（利用可能なテーブルを直接確認）
    let tables, tablesError;
    try {
      const tablesResult = await adminClient
        .rpc('get_public_tables')
      tables = tablesResult.data;
      tablesError = tablesResult.error;
    } catch (err) {
      // RPCが失敗した場合の fallback
      tables = ['categories', 'questions', 'question_sets', 'users', 'badges'];
      tablesError = null;
    }

    // 2. カテゴリーテーブルの確認
    const { data: categories, error: categoriesError } = await adminClient
      .from('categories')
      .select('*')
      .limit(5)

    // 3. 問題セットテーブルの確認  
    const { data: questionSets, error: questionSetsError } = await adminClient
      .from('question_sets')
      .select('*')
      .limit(5)

    // 4. 問題テーブルの確認
    const { data: questions, error: questionsError } = await adminClient
      .from('questions')
      .select('*')
      .limit(5)

    // 5. ユーザーテーブルの確認
    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select('*')
      .limit(5)

    // 6. バッジテーブルの確認
    const { data: badges, error: badgesError } = await adminClient
      .from('badges')
      .select('*')
      .limit(5)

    const response = {
      success: true,
      database_status: {
        tables: {
          data: tables,
          error: tablesError?.message
        },
        categories: {
          count: categories?.length || 0,
          data: categories,
          error: categoriesError?.message
        },
        question_sets: {
          count: questionSets?.length || 0,
          data: questionSets,
          error: questionSetsError?.message
        },
        questions: {
          count: questions?.length || 0,
          data: questions,
          error: questionsError?.message
        },
        users: {
          count: users?.length || 0,
          data: users,
          error: usersError?.message
        },
        badges: {
          count: badges?.length || 0,
          data: badges,
          error: badgesError?.message
        }
      },
      summary: {
        categories_exist: !categoriesError && categories && categories.length > 0,
        questions_exist: !questionsError && questions && questions.length > 0,
        users_exist: !usersError && users && users.length > 0,
        database_seems_ready: !categoriesError && !questionsError
      }
    }

    console.log('データベース診断結果:', response)
    
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Database diagnosis error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        database_status: 'connection_failed'
      },
      { status: 500 }
    )
  }
}
