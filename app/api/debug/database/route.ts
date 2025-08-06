import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    console.log('Starting database schema check...')
    
    // テーブル構造を確認
    const schemaInfo = await adminClient
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'categories')
      .order('ordinal_position')
    
    console.log('Schema query result:', schemaInfo)
    
    // カテゴリーデータを確認
    const categoriesData = await adminClient
      .from('categories')
      .select('*')
      .limit(5)
    
    console.log('Categories data result:', categoriesData)
    
    // カテゴリー作成テスト（最小限のデータ）
    const testCreate = await adminClient
      .from('categories')
      .insert([{ name: 'テストカテゴリー_' + Date.now() }])
      .select()
    
    console.log('Test create result:', testCreate)
    
    // 作成されたテストデータを削除
    if (testCreate.data && testCreate.data.length > 0) {
      const deleteResult = await adminClient
        .from('categories')
        .delete()
        .eq('id', testCreate.data[0].id)
      
      console.log('Test delete result:', deleteResult)
    }
    
    return NextResponse.json({
      success: true,
      schema_info: schemaInfo,
      categories_data: categoriesData,
      test_create: testCreate
    })
    
  } catch (error: any) {
    console.error('Database debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
