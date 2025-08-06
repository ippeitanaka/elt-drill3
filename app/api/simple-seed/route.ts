import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('シンプルなデータ投入を開始します...')
    const adminClient = createServerClient()
    
    // 1. カテゴリーをシンプルに投入（最小限のフィールドのみ）
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
      console.error('Categories insertion error:', categoriesError)
      return NextResponse.json(
        { success: false, error: 'カテゴリーの投入に失敗: ' + categoriesError.message },
        { status: 500 }
      )
    }

    // 2. 問題セットを投入
    const questionSetsData = insertedCategories?.map((category, index) => ({
      category_id: category.id,
      title: `${category.name}基礎`,
      description: `${category.name}の基本的な知識`,
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
        { success: false, error: '問題セット投入失敗: ' + questionSetsError.message },
        { status: 500 }
      )
    }

    // 3. サンプル問題を投入
    const questionsData = [
      {
        question_set_id: insertedQuestionSets?.find(qs => qs.title.includes('心肺蘇生法'))?.id,
        question_text: '成人の心肺蘇生において、胸骨圧迫の深さはどのくらいが適切ですか？',
        option_a: '3-4cm',
        option_b: '5-6cm',
        option_c: '7-8cm',
        option_d: '9-10cm',
        correct_answer: 'B',
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
        explanation: 'ABCDEアプローチでは、まず気道（Airway）の確保が最優先です。',
        order_index: 1
      },
      {
        question_set_id: insertedQuestionSets?.find(qs => qs.title.includes('呼吸器疾患'))?.id,
        question_text: '呼吸困難の患者で最も緊急性が高いのはどの状態ですか？',
        option_a: 'SpO2 95%',
        option_b: 'チアノーゼの出現',
        option_c: '呼吸数30回/分',
        option_d: '起座呼吸',
        correct_answer: 'B',
        explanation: 'チアノーゼは重篤な酸素化障害を示し、最も緊急性が高い徴候です。',
        order_index: 1
      },
      {
        question_set_id: insertedQuestionSets?.find(qs => qs.title.includes('循環器疾患'))?.id,
        question_text: '急性心筋梗塞の典型的な症状はどれですか？',
        option_a: '鋭い刺すような痛み',
        option_b: '圧迫感のある胸部痛',
        option_c: '呼吸に伴う痛み',
        option_d: '体位変換で軽減する痛み',
        correct_answer: 'B',
        explanation: '急性心筋梗塞では圧迫感や締めつけられるような胸部痛が特徴的です。',
        order_index: 1
      },
      {
        question_set_id: insertedQuestionSets?.find(qs => qs.title.includes('法規・制度'))?.id,
        question_text: '救急救命士が実施できる特定行為はどれですか？',
        option_a: '気管挿管',
        option_b: '薬剤投与',
        option_c: '除細動',
        option_d: 'すべて',
        correct_answer: 'D',
        explanation: '救急救命士は医師の指示の下、気管挿管、薬剤投与、除細動すべてを実施できます。',
        order_index: 1
      }
    ].filter(q => q.question_set_id) // 有効なquestion_set_idを持つもののみ

    if (questionsData.length > 0) {
      const { error: questionsError } = await adminClient
        .from('questions')
        .insert(questionsData)

      if (questionsError) {
        console.log('Questions insertion error:', questionsError.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: '救急救命士試験データの投入が完了しました',
      data: {
        categories: insertedCategories?.length || 0,
        question_sets: insertedQuestionSets?.length || 0,
        questions: questionsData.length
      }
    })

  } catch (error: any) {
    console.error('Simple data seeding error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
