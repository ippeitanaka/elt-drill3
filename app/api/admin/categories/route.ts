import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    const { data: categories, error } = await adminClient
      .from('categories')
      .select(`
        *,
        question_sets(count)
      `)
      .order('id')
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    // 問題数を含めてフォーマット（デフォルト値を設定）
    const formattedCategories = categories?.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description || `${category.name}に関する問題`,
      icon: category.icon || '📚',
      color: category.color || 'blue',
      created_at: category.created_at,
      question_count: category.question_sets?.length || 0
    })) || []
    
    return NextResponse.json({
      success: true,
      categories: formattedCategories
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    const { name, description, icon, color } = await request.json()
    
    // 現在のテーブル構造（id, name, created_at）に合わせて作成
    const { data, error } = await adminClient
      .from('categories')
      .insert([{ name }])
      .select()
    
    if (error) {
      console.error('Category creation error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    // レスポンスにはデフォルト値を含める
    const category = {
      ...data[0],
      description: description || `${name}に関する問題`,
      icon: icon || '📚',
      color: color || 'blue'
    }
    
    return NextResponse.json({
      success: true,
      category: category,
      message: 'カテゴリーが作成されました'
    })
    
  } catch (error: any) {
    console.error('Category creation exception:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    const { id, name, description, icon, color } = await request.json()
    
    // 現在のテーブル構造では名前のみ更新可能
    const { data, error } = await adminClient
      .from('categories')
      .update({ name })
      .eq('id', id)
      .select()
    
    if (error) {
      console.error('Category update error:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    // レスポンスにはユーザー指定の値を含める
    const category = {
      ...data[0],
      description: description || `${name}に関する問題`,
      icon: icon || '📚',
      color: color || 'blue'
    }
    
    return NextResponse.json({
      success: true,
      category: category,
      message: 'カテゴリーが更新されました'
    })
    
  } catch (error: any) {
    console.error('Category update exception:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'IDが必要です'
      }, { status: 400 })
    }
    
    // 関連する問題がないかチェック
    const { count: questionsCount } = await adminClient
      .from('question_sets')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
    
    if (questionsCount && questionsCount > 0) {
      return NextResponse.json({
        success: false,
        error: 'このカテゴリーには問題が存在するため削除できません'
      }, { status: 400 })
    }
    
    const { error } = await adminClient
      .from('categories')
      .delete()
      .eq('id', id)
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'カテゴリーが削除されました'
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
