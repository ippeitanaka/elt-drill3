import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    // 全てのカテゴリーを詳細情報付きで取得
    const { data: categories, error } = await adminClient
      .from('categories')
      .select('*')
      .order('id')
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `データベースから ${categories?.length || 0} 個のカテゴリーを取得`,
      categories: categories || [],
      raw_query_result: categories
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
