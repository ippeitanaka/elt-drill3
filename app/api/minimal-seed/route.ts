import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('最小限のデータ投入を開始します...')
    const adminClient = createServerClient()
    
    // 1. カテゴリーを最小限で投入
    const categoriesData = [
      { name: '心肺蘇生法' },
      { name: '薬理学' },
      { name: '外傷処置' },
      { name: '呼吸器疾患' },
      { name: '循環器疾患' },
      { name: '法規・制度' }
    ]

    const { data: insertedCategories, error: categoriesError } = await adminClient
      .from('categories')
      .insert(categoriesData)
      .select()

    if (categoriesError) {
      return NextResponse.json(
        { success: false, error: 'カテゴリー投入失敗: ' + categoriesError.message },
        { status: 500 }
      )
    }

    // 2. 問題セットを最小限で投入
    const questionSetsData = insertedCategories?.map((category, index) => ({
      category_id: category.id,
      title: `${category.name}基礎`,
      order_index: index + 1
    })) || []

    const { data: insertedQuestionSets, error: questionSetsError } = await adminClient
      .from('question_sets')
      .insert(questionSetsData)
      .select()

    if (questionSetsError) {
      return NextResponse.json(
        { success: false, error: '問題セット投入失敗: ' + questionSetsError.message },
        { status: 500 }
      )
    }

    // 3. サンプル問題を最小限で投入
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
      message: '最小限のデータ投入が完了しました',
      data: {
        categories: insertedCategories?.length || 0,
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
