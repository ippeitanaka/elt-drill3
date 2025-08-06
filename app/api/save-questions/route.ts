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

    // 既存の問題セットを使用するか、新規作成を試行
    let questionSetId;
    
    // まず既存の問題セットを確認
    const { data: existingSets } = await adminClient
      .from("question_sets")
      .select('id')
      .eq('category_id', categoryId)
      .limit(1)

    if (existingSets && existingSets.length > 0) {
      // 既存のセットを使用
      questionSetId = existingSets[0].id
      console.log('Using existing question set:', questionSetId)
    } else {
      // 新規作成を試行（name フィールドを含む）
      const { data: newSet, error: setError } = await adminClient
        .from("question_sets")
        .insert({
          category_id: categoryId,
          name: title || `アップロード - ${new Date().toLocaleDateString("ja-JP")}`,
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
      
      questionSetId = newSet.id
      console.log('Created new question set:', questionSetId)
    }

    // 問題を挿入（実際のスキーマに合わせて）
    const questionsToInsert = questions.map((q: any, index: number) => {
      const choices = q.choices || []
      
      // 選択肢をJSON形式で保存
      const options = {
        a: choices[0] || q.option_a || "選択肢1",
        b: choices[1] || q.option_b || "選択肢2",
        c: choices[2] || q.option_c || "選択肢3",
        d: choices[3] || q.option_d || "選択肢4",
        e: choices[4] || q.option_e || "選択肢5"
      }
      
      // 正解情報を配列形式で保存
      const correctAnswers = [q.correct_answer || "a"]
      
      return {
        question_set_id: questionSetId,
        question_text: q.question_text,
        question_number: index + 1,
        options: JSON.stringify(options),
        correct_answers: JSON.stringify(correctAnswers)
      }
    })

        console.log("Save questions API - 受信データ:", {
      categoryId,
      questionsCount: questions.length,
      title,
      description
    })

    // 問題データの詳細ログ
    questions.forEach((q: any, index: number) => {
      console.log(`問題${index + 1}:`, {
        question_text: q.question_text?.substring(0, 100) + "...",
        option_a: q.option_a?.substring(0, 50) + "...",
        option_b: q.option_b?.substring(0, 50) + "...", 
        option_c: q.option_c?.substring(0, 50) + "...",
        option_d: q.option_d?.substring(0, 50) + "...",
        option_e: q.option_e?.substring(0, 50) + "...",
        correct_answer: q.correct_answer,
        hasChoices: !!q.choices,
        choicesLength: q.choices?.length || 0
      })
    })

    const { error: questionsError } = await adminClient.from("questions").insert(questionsToInsert)

    if (questionsError) {
      console.error("Questions insert error:", questionsError)
      return NextResponse.json(
        { error: `Questions insert error: ${questionsError.message}` },
        { status: 500 }
      )
    }

    // カテゴリーの問題数を直接更新
    try {
      const { count } = await adminClient
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("category_id", categoryId)

      await adminClient
        .from("categories")
        .update({ question_count: count || 0 })
        .eq("id", categoryId)

      console.log(`Updated category ${categoryId} question count to ${count}`)
    } catch (updateError) {
      console.warn("Category count update failed:", updateError)
      // カウント更新が失敗してもエラーにしない
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        questionSetId: questionSetId,
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
