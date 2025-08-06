import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('Supabase接続テストを開始します...')
    
    // 1. 基本的な接続テスト
    const adminClient = createServerClient()
    
    // 2. シンプルなクエリでテーブルの存在確認
    const categoryTest = await adminClient
      .from('categories')
      .select('count')
      .limit(1)
      
    const questionTest = await adminClient  
      .from('questions')
      .select('count')
      .limit(1)
      
    const userTest = await adminClient
      .from('users') 
      .select('count')
      .limit(1)

    console.log('テーブル接続結果:', {
      categories: categoryTest,
      questions: questionTest,
      users: userTest
    })

    return NextResponse.json({
      success: true,
      connection_test: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'default_url_used',
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        tables: {
          categories: {
            exists: !categoryTest.error,
            error: categoryTest.error?.message
          },
          questions: {
            exists: !questionTest.error,
            error: questionTest.error?.message
          },
          users: {
            exists: !userTest.error,
            error: userTest.error?.message
          }
        }
      }
    })

  } catch (error: any) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}
