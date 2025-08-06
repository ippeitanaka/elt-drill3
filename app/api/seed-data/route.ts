import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('救急救命士試験データの投入を開始します...')
    const adminClient = createServerClient()
    
    // 1. 既存のカテゴリーをクリア（必要に応じて）
    await adminClient.from('categories').delete().neq('id', 0)
    
    // 2. 救急救命士試験用のカテゴリーを投入
    const categoriesData = [
      {
        name: '心肺蘇生法',
        icon: 'heart-pulse',
        color: 'red',
        description: '心停止患者への蘇生処置に関する問題'
      },
      {
        name: '薬理学',
        icon: 'pill',
        color: 'blue',
        description: '救急薬剤の作用機序と使用法'
      },
      {
        name: '外傷処置',
        icon: 'bandage',
        color: 'orange',
        description: '外傷患者の初期評価と処置'
      },
      {
        name: '呼吸器疾患',
        icon: 'lungs',
        color: 'green',
        description: '呼吸困難患者への対応'
      },
      {
        name: '循環器疾患',
        icon: 'heart',
        color: 'purple',
        description: '循環器系の救急疾患'
      },
      {
        name: '法規・制度',
        icon: 'scale',
        color: 'indigo',
        description: '救急救命士に関する法規と制度'
      }
    ]

    const { data: insertedCategories, error: categoriesError } = await adminClient
      .from('categories')
      .insert(categoriesData)
      .select()

    if (categoriesError) {
      console.error('Categories insertion error:', categoriesError)
      return NextResponse.json(
        { success: false, error: 'カテゴリーの投入に失敗しました: ' + categoriesError.message },
        { status: 500 }
      )
    }

    // 3. 問題セットの投入
    const questionSetsData = insertedCategories?.map((category, index) => ({
      category_id: category.id,
      title: `${category.name}基礎`,
      description: `${category.name}の基本的な知識と技術`,
      order_index: index + 1,
      is_active: true
    })) || []

    const { data: insertedQuestionSets, error: questionSetsError } = await adminClient
      .from('question_sets')
      .insert(questionSetsData)
      .select()

    if (questionSetsError) {
      console.error('Question sets insertion error:', questionSetsError)
      return NextResponse.json(
        { success: false, error: '問題セットの投入に失敗しました: ' + questionSetsError.message },
        { status: 500 }
      )
    }

    // 4. サンプル問題の投入
    const sampleQuestions = [
      {
        question_set_id: insertedQuestionSets?.find(qs => qs.title.includes('心肺蘇生法'))?.id,
        question_text: '成人の心肺蘇生において、胸骨圧迫の深さはどのくらいが適切ですか？',
        option_a: '3-4cm',
        option_b: '5-6cm',
        option_c: '7-8cm',
        option_d: '9-10cm',
        correct_answer: 'B',
        difficulty: 'medium',
        explanation: '成人のCPRでは胸骨圧迫の深さは5-6cmが推奨されています。',
        order_index: 1
      },
      {
        question_set_id: insertedQuestionSets?.find(qs => qs.title.includes('薬理学'))?.id,
        question_text: 'アドレナリンの主な作用機序は何ですか？',
        option_a: 'β受容体遮断',
        option_b: 'α・β受容体刺激',
        option_c: 'カルシウム拮抗',
        option_d: 'ACE阻害',
        correct_answer: 'B',
        difficulty: 'medium',
        explanation: 'アドレナリンはα・β受容体を刺激し、心収縮力増強と血管収縮作用を示します。',
        order_index: 1
      },
      {
        question_set_id: insertedQuestionSets?.find(qs => qs.title.includes('外傷処置'))?.id,
        question_text: '外傷患者の初期評価で最初に確認すべきことは何ですか？',
        option_a: '意識レベル',
        option_b: '気道の確保',
        option_c: '呼吸状態',
        option_d: '循環状態',
        correct_answer: 'B',
        difficulty: 'medium',
        explanation: 'ABCDEアプローチでは、まず気道（Airway）の確保が最優先です。',
        order_index: 1
      }
    ]

    const validQuestions = sampleQuestions.filter(q => q.question_set_id)

    if (validQuestions.length > 0) {
      const { error: questionsError } = await adminClient
        .from('questions')
        .insert(validQuestions)

      if (questionsError) {
        console.error('Questions insertion error:', questionsError)
      }
    }

    // 5. カテゴリーの問題数を更新
    for (const category of insertedCategories || []) {
      const { count } = await adminClient
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .in('question_set_id', insertedQuestionSets?.filter(qs => qs.category_id === category.id).map(qs => qs.id) || [])

      await adminClient
        .from('categories')
        .update({ total_questions: count || 0 })
        .eq('id', category.id)
    }

    return NextResponse.json({
      success: true,
      message: '救急救命士試験データの投入が完了しました',
      data: {
        categories_inserted: insertedCategories?.length || 0,
        question_sets_inserted: insertedQuestionSets?.length || 0,
        questions_inserted: validQuestions.length
      }
    })

  } catch (error: any) {
    console.error('Data seeding error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}
