import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('既存データの更新と新規投入を開始します...')
    const adminClient = createServerClient()
    
    // 1. 既存の「心肺停止」を「心肺蘇生法」に更新
    const { error: updateError } = await adminClient
      .from('categories')
      .update({ name: '心肺蘇生法' })
      .eq('name', '心肺停止')

    if (updateError) {
      console.log('Update error:', updateError.message)
    }

    // 2. 新しいカテゴリーを追加
    const newCategoriesData = [
      { name: '薬理学' },
      { name: '外傷処置' },
      { name: '呼吸器疾患' },
      { name: '循環器疾患' },
      { name: '法規・制度' }
    ]

    const { data: insertedCategories, error: categoriesError } = await adminClient
      .from('categories')
      .insert(newCategoriesData)
      .select()

    if (categoriesError) {
      console.log('Categories error:', categoriesError.message)
    }

    // 3. すべてのカテゴリーを取得
    const { data: allCategories, error: getAllError } = await adminClient
      .from('categories')
      .select('*')

    if (getAllError) {
      return NextResponse.json(
        { success: false, error: 'カテゴリー取得失敗: ' + getAllError.message },
        { status: 500 }
      )
    }

    // 4. 問題セットを作成
    const questionSetsData = allCategories?.map((category, index) => ({
      category_id: category.id,
      title: `${category.name}基礎`,
      order_index: index + 1
    })) || []

    const { data: insertedQuestionSets, error: questionSetsError } = await adminClient
      .from('question_sets')
      .insert(questionSetsData)
      .select()

    // 5. サンプル問題を作成
    const questionsData = [
      {
        question_set_id: insertedQuestionSets?.find(qs => qs.title.includes('心肺蘇生法'))?.id,
        question_text: '成人の心肺蘇生において、胸骨圧迫の深さはどのくらいが適切ですか？',
        option_a: '3-4cm',
        option_b: '5-6cm',
        option_c: '7-8cm',
        option_d: '9-10cm',
        correct_answer: 'B'
      },
      {
        question_set_id: insertedQuestionSets?.find(qs => qs.title.includes('薬理学'))?.id,
        question_text: 'アドレナリンの主な作用機序は何ですか？',
        option_a: 'β受容体遮断',
        option_b: 'α・β受容体刺激',
        option_c: 'カルシウム拮抗',
        option_d: 'ACE阻害',
        correct_answer: 'B'
      },
      {
        question_set_id: insertedQuestionSets?.find(qs => qs.title.includes('外傷処置'))?.id,
        question_text: '外傷患者の初期評価で最初に確認すべきことは何ですか？',
        option_a: '意識レベル',
        option_b: '気道の確保',
        option_c: '呼吸状態',
        option_d: '循環状態',
        correct_answer: 'B'
      }
    ].filter(q => q.question_set_id)

    if (questionsData.length > 0) {
      const { error: questionsError } = await adminClient
        .from('questions')
        .insert(questionsData)

      if (questionsError) {
        console.log('Questions error:', questionsError.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: '救急救命士試験データの投入が完了しました！',
      data: {
        total_categories: allCategories?.length || 0,
        new_categories: insertedCategories?.length || 0,
        question_sets: insertedQuestionSets?.length || 0,
        questions: questionsData.length
      }
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
