import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 カテゴリーデバッグAPI開始')
    
    const adminClient = createServerClient()
    
    // シンプルにカテゴリーのみを取得
    const { data: categories, error } = await adminClient
      .from('categories')
      .select('id, name, created_at')
      .order('name')

    console.log('📊 カテゴリー取得結果:', { categories, error })

    if (error) {
      console.error('❌ カテゴリー取得エラー:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
      count: categories?.length || 0,
      message: `${categories?.length || 0}個のカテゴリーを取得しました`
    })

  } catch (error: any) {
    console.error('❌ カテゴリーデバッグAPIエラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
