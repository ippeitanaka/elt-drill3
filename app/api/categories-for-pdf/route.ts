import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    // 管理用APIと全く同じクエリを使用
    const { data: categories, error } = await adminClient
      .from('categories')
      .select(`
        *,
        question_sets(count)
      `)
      .order('id')
    
    if (error) {
      console.error('PDF用カテゴリー取得エラー:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        message: 'カテゴリーの取得に失敗しました'
      }, { status: 500 })
    }
    
    if (!categories || categories.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'カテゴリーが見つかりませんでした',
        categories: [],
        count: 0
      })
    }
    
    // PDFアップロード用のシンプルな形式に変換
    const simplifiedCategories = categories.map(cat => ({
      id: cat.id.toString(),
      name: cat.name,
      value: cat.id.toString() // <Select>コンポーネント用
    }))
    
    console.log('PDF用カテゴリー取得成功:', simplifiedCategories.length + '個')
    
    return NextResponse.json({
      success: true,
      message: `✅ ${simplifiedCategories.length}個のカテゴリーを取得しました`,
      categories: simplifiedCategories,
      count: simplifiedCategories.length
    })
    
  } catch (error: any) {
    console.error('PDF用カテゴリー取得例外:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'PDFアップロード用カテゴリー取得エラー'
    }, { status: 500 })
  }
}
