import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    
    // 全カテゴリーを取得
    const { data: categories, error: categoriesError } = await adminClient
      .from('categories')
      .select('id, name')
    
    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 })
    }

    const updates = []
    
    // 各カテゴリーの実際の問題数を計算して更新
    for (const category of categories) {
      const { count } = await adminClient
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category.id)
      
      const { error: updateError } = await adminClient
        .from('categories')
        .update({ question_count: count || 0 })
        .eq('id', category.id)
      
      if (updateError) {
        console.error(`Failed to update category ${category.name}:`, updateError)
      } else {
        updates.push({
          categoryId: category.id,
          categoryName: category.name,
          questionCount: count || 0
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updates.length}個のカテゴリーの問題数を更新しました`,
      updates
    })

  } catch (error: any) {
    console.error('Update category counts API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
