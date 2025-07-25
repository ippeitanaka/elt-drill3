import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    const body = await request.json()
    
    const { categoryId, questions, title, description } = body

    if (!categoryId || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Category ID and questions array are required' },
        { status: 400 }
      )
    }

    // 問題セットを作成
    const { data: questionSet, error: setError } = await adminClient
      .from("question_sets")
      .insert({
        category_id: categoryId,
        title: title || `アップロード - ${new Date().toLocaleDateString("ja-JP")}`,
        description: description || `問題セット（${questions.length}問）`,
        order_index: 1,
      })
      .select()
      .single()

    if (setError) {
      console.error("Question set creation error:", setError)
      return NextResponse.json(
        { error: `Question set creation error: ${setError.message}` },
        { status: 500 }
      )
    }

    // 問題を挿入
    const questionsToInsert = questions.map((q: any, index: number) => {
      const choices = q.choices || []
      return {
        question_set_id: questionSet.id,
        question_text: q.question_text,
        option_a: choices[0] || q.option_a || "選択肢1",
        option_b: choices[1] || q.option_b || "選択肢2", 
        option_c: choices[2] || q.option_c || "選択肢3",
        option_d: choices[3] || q.option_d || "選択肢4",
        option_e: choices[4] || q.option_e || "選択肢5", // option_eを追加
        correct_answer: q.correct_answer || "A",
        difficulty: "medium",
        order_index: index + 1,
      }
    })

    console.log("Inserting questions to database:", questionsToInsert)

    const { error: questionsError } = await adminClient.from("questions").insert(questionsToInsert)

    if (questionsError) {
      console.error("Questions insert error:", questionsError)
      return NextResponse.json(
        { error: `Questions insert error: ${questionsError.message}` },
        { status: 500 }
      )
    }

    // カテゴリーの問題数を更新
    try {
      await adminClient.rpc("update_category_question_count", {
        category_id: categoryId,
      })
    } catch (rpcError) {
      console.warn("Category count update failed:", rpcError)
      // RPCが失敗してもエラーにしない
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        questionSetId: questionSet.id,
        questionsCount: questions.length
      },
      message: `${questions.length}問をデータベースに保存しました。`
    })

  } catch (error: any) {
    console.error('Save questions API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
