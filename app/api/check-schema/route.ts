import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    
    // 既存のカテゴリーテーブルの構造を確認
    const { data: existingCategories, error } = await adminClient
      .from('categories')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      current_structure: {
        categories: existingCategories?.[0] || 'No data',
        available_columns: existingCategories?.[0] ? Object.keys(existingCategories[0]) : []
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
