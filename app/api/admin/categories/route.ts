import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const hasServerEnv = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET() {
  try {
    if (!hasServerEnv()) {
      // モックフォールバック
      const now = new Date().toISOString()
      const mock = [
        { id: 'mock-1', name: '基礎英文法', description: '基礎英文法に関する問題', icon: '📚', color: 'blue', created_at: now, question_count: 12 },
        { id: 'mock-2', name: 'リスニング', description: 'リスニングに関する問題', icon: '🎧', color: 'green', created_at: now, question_count: 8 },
      ]
      return NextResponse.json({ success: true, categories: mock })
    }

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
    const formattedCategories = categories?.map((category: any) => ({
      id: category.id,
      name: category.name,
      description: category.description || `${category.name}に関する問題`,
      icon: category.icon || '📚',
      color: category.color || 'blue',
      created_at: category.created_at,
      question_count: (category.question_sets && Array.isArray(category.question_sets)) ? category.question_sets.length : (category.question_sets?.count ?? 0)
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
    const { name, description, icon, color } = await request.json()

    if (!hasServerEnv()) {
      // モックフォールバック（非永続）
      const now = new Date().toISOString()
      return NextResponse.json({
        success: true,
        category: {
          id: `mock-${Math.random().toString(36).slice(2, 8)}`,
          name,
          description: description || `${name}に関する問題`,
          icon: icon || '📚',
          color: color || 'blue',
          created_at: now,
          question_count: 0
        },
        message: 'カテゴリーが作成されました（モック）'
      })
    }

    const adminClient = createServerClient()

    // 現在のテーブル構造（id, name, created_at）に合わせて作成
    const { data, error } = await adminClient
      .from('categories')
      .insert([{ name, description, icon, color }])
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
      ...data![0],
      description: description || data![0].description || `${name}に関する問題`,
      icon: data![0].icon || icon || '📚',
      color: data![0].color || color || 'blue'
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
    const { id, name, description, icon, color } = await request.json()

    if (!hasServerEnv()) {
      // モックフォールバック（非永続）
      return NextResponse.json({
        success: true,
        category: { id, name, description, icon, color },
        message: 'カテゴリーが更新されました（モック）'
      })
    }

    const adminClient = createServerClient()

    // 現在のテーブル構造では名前などを更新
    const { data, error } = await adminClient
      .from('categories')
      .update({ name, description, icon, color })
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
      ...data![0],
      description: data![0].description || description || `${name}に関する問題`,
      icon: data![0].icon || icon || '📚',
      color: data![0].color || color || 'blue'
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'IDが必要です'
      }, { status: 400 })
    }

    if (!hasServerEnv()) {
      // モックフォールバック（非永続）
      return NextResponse.json({
        success: true,
        message: 'カテゴリーが削除されました（モック）'
      })
    }

    const adminClient = createServerClient()

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
