import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const adminClient = createServerClient()
    
    // 1. 既存のカテゴリーをすべて削除
    await adminClient.from('categories').delete().neq('id', 0)
    
    // 2. 救急救命士国家試験の6つのカテゴリーを作成
    const categoriesData = [
      { name: '心肺蘇生法' },
      { name: '薬理学' },
      { name: '外傷処置' },
      { name: '呼吸器疾患' },
      { name: '循環器疾患' },
      { name: '法規・制度' }
    ]
    
    const { data: categories, error: categoriesError } = await adminClient
      .from('categories')
      .insert(categoriesData)
      .select()
    
    if (categoriesError) {
      return NextResponse.json({
        success: false,
        error: `カテゴリー作成エラー: ${categoriesError.message}`
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: '📚 救急救命士国家試験のカテゴリーを作成しました',
      total: categories?.length || 0,
      categories: categories?.map(c => ({ id: c.id, name: c.name })) || []
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
