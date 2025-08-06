import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()

    // カテゴリー別の問題数を確認
    const { data: categories, error: catError } = await adminClient
      .from('categories')
      .select('id, name')

    if (catError) {
      throw catError
    }

    const results = []

    for (const category of categories || []) {
      // 問題セット数（すべての問題セットを取得）
      const { data: questionSets, error: setError } = await adminClient
        .from('question_sets')
        .select('id, name')
        .eq('category_id', category.id)

      if (setError) {
        console.error('Question sets error:', setError)
        continue
      }

      const questionSetIds = questionSets?.map(qs => qs.id) || []
      
      // デバッグ情報
      console.log(`カテゴリー "${category.name}" (ID: ${category.id}):`, {
        questionSets: questionSets?.length || 0,
        questionSetIds
      })

      // 問題数（より確実な方法で取得）
      let questionCount = 0
      if (questionSetIds.length > 0) {
        const { data: questionsData, error: qError } = await adminClient
          .from('questions')
          .select('id')
          .in('question_set_id', questionSetIds)

        if (!qError && questionsData) {
          questionCount = questionsData.length
          console.log(`カテゴリー "${category.name}": ${questionCount}問見つかりました`)
        } else if (qError) {
          console.error('Questions count error:', qError)
        }
      }

      results.push({
        category: {
          id: category.id,
          name: category.name
        },
        questionSets: questionSets?.length || 0,
        questionSetsList: questionSets?.map(qs => ({
          id: qs.id,
          name: qs.name
        })) || [],
        questions: questionCount
      })
    }

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        totalCategories: categories?.length || 0,
        totalQuestions: results.reduce((sum, r) => sum + r.questions, 0)
      }
    })

  } catch (error: any) {
    console.error('Question count API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
