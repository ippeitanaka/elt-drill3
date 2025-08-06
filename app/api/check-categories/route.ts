import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    // カテゴリーテーブルの実際の構造を確認
    const { data: categories, error: categoriesError } = await adminClient
      .from('categories')
      .select('*')
      .limit(1)
    
    const categoryFields = categories?.[0] ? Object.keys(categories[0]) : []
    
    // 全カテゴリーのデータも取得
    const { data: allCategories, error: allCategoriesError } = await adminClient
      .from('categories')
      .select('*')
      .order('id')
    
    return NextResponse.json({
      success: true,
      message: '📋 カテゴリーテーブルの詳細情報',
      category_structure: {
        available_fields: categoryFields,
        sample_category: categories?.[0] || null,
        total_categories: allCategories?.length || 0
      },
      all_categories: allCategories || [],
      required_fields_for_admin: [
        'id', 'name', 'icon', 'color', 'description', 
        'total_questions', 'created_at', 'updated_at'
      ],
      missing_fields: [
        'icon', 'color', 'description', 'total_questions', 'updated_at'
      ].filter(field => !categoryFields.includes(field))
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
