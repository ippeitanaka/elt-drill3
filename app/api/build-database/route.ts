import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 新しいデータベーススキーマを段階的に作成します...')
    const adminClient = createServerClient()
    
    const results: any[] = []

    // 1. 既存のテーブルを削除
    try {
      await adminClient.from('user_badges').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await adminClient.from('badges').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await adminClient.from('study_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await adminClient.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await adminClient.from('question_sets').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await adminClient.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      results.push({ step: 'cleanup', status: 'completed' })
    } catch (error: any) {
      results.push({ step: 'cleanup', status: 'partial', error: error.message })
    }

    // 2. 救急救命士試験用カテゴリーを作成
    const categoriesData = [
      {
        name: '心肺蘇生法',
        icon: 'heart-pulse',
        color: 'red',
        description: '心停止患者への蘇生処置に関する問題',
        total_questions: 0
      },
      {
        name: '薬理学',
        icon: 'pill',
        color: 'blue',
        description: '救急薬剤の作用機序と使用法',
        total_questions: 0
      },
      {
        name: '外傷処置',
        icon: 'bandage',
        color: 'orange',
        description: '外傷患者の初期評価と処置',
        total_questions: 0
      },
      {
        name: '呼吸器疾患',
        icon: 'lungs',
        color: 'green',
        description: '呼吸困難患者への対応',
        total_questions: 0
      },
      {
        name: '循環器疾患',
        icon: 'heart',
        color: 'purple',
        description: '循環器系の救急疾患',
        total_questions: 0
      },
      {
        name: '法規・制度',
        icon: 'scale',
        color: 'indigo',
        description: '救急救命士に関する法規と制度',
        total_questions: 0
      }
    ]

    const { data: insertedCategories, error: categoriesError } = await adminClient
      .from('categories')
      .insert(categoriesData)
      .select()

    if (categoriesError) {
      results.push({ step: 'categories', status: 'failed', error: categoriesError.message })
    } else {
      results.push({ step: 'categories', status: 'success', count: insertedCategories?.length })
    }

    // 3. 問題セットを作成
    if (insertedCategories && insertedCategories.length > 0) {
      const questionSetsData = insertedCategories.map((category, index) => ({
        category_id: category.id,
        title: `${category.name}基礎`,
        description: `${category.name}の基本的な知識と技術`,
        order_index: index + 1,
        is_active: true
      }))

      const { data: insertedQuestionSets, error: questionSetsError } = await adminClient
        .from('question_sets')
        .insert(questionSetsData)
        .select()

      if (questionSetsError) {
        results.push({ step: 'question_sets', status: 'failed', error: questionSetsError.message })
      } else {
        results.push({ step: 'question_sets', status: 'success', count: insertedQuestionSets?.length })

        // 4. サンプル問題を作成
        if (insertedQuestionSets && insertedQuestionSets.length > 0) {
          const questionsData = [
            {
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('心肺蘇生法'))?.id,
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
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('薬理学'))?.id,
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
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('外傷処置'))?.id,
              question_text: '外傷患者の初期評価で最初に確認すべきことは何ですか？',
              option_a: '意識レベル',
              option_b: '気道の確保',
              option_c: '呼吸状態',
              option_d: '循環状態',
              correct_answer: 'B',
              difficulty: 'medium',
              explanation: 'ABCDEアプローチでは、まず気道（Airway）の確保が最優先です。',
              order_index: 1
            },
            {
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('呼吸器疾患'))?.id,
              question_text: '呼吸困難の患者で最も緊急性が高いのはどの状態ですか？',
              option_a: 'SpO2 95%',
              option_b: 'チアノーゼの出現',
              option_c: '呼吸数30回/分',
              option_d: '起座呼吸',
              correct_answer: 'B',
              difficulty: 'medium',
              explanation: 'チアノーゼは重篤な酸素化障害を示し、最も緊急性が高い徴候です。',
              order_index: 1
            },
            {
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('循環器疾患'))?.id,
              question_text: '急性心筋梗塞の典型的な症状はどれですか？',
              option_a: '鋭い刺すような痛み',
              option_b: '圧迫感のある胸部痛',
              option_c: '呼吸に伴う痛み',
              option_d: '体位変換で軽減する痛み',
              correct_answer: 'B',
              difficulty: 'medium',
              explanation: '急性心筋梗塞では圧迫感や締めつけられるような胸部痛が特徴的です。',
              order_index: 1
            },
            {
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('法規・制度'))?.id,
              question_text: '救急救命士が実施できる特定行為はどれですか？',
              option_a: '気管挿管',
              option_b: '薬剤投与',
              option_c: '除細動',
              option_d: 'すべて',
              correct_answer: 'D',
              difficulty: 'medium',
              explanation: '救急救命士は医師の指示の下、気管挿管、薬剤投与、除細動すべてを実施できます。',
              order_index: 1
            }
          ].filter(q => q.question_set_id) // 有効なquestion_set_idのもののみ

          const { data: insertedQuestions, error: questionsError } = await adminClient
            .from('questions')
            .insert(questionsData)
            .select()

          if (questionsError) {
            results.push({ step: 'questions', status: 'failed', error: questionsError.message })
          } else {
            results.push({ step: 'questions', status: 'success', count: insertedQuestions?.length })

            // 5. カテゴリーの問題数を更新
            for (const category of insertedCategories) {
              const questionSetIds = insertedQuestionSets
                .filter(qs => qs.category_id === category.id)
                .map(qs => qs.id)

              const { count } = await adminClient
                .from('questions')
                .select('*', { count: 'exact', head: true })
                .in('question_set_id', questionSetIds)

              await adminClient
                .from('categories')
                .update({ total_questions: count || 0 })
                .eq('id', category.id)
            }
            results.push({ step: 'update_counts', status: 'success' })
          }
        }
      }
    }

    // 6. バッジの作成
    const badgesData = [
      {
        name: '完璧な成績',
        description: '100点を獲得',
        icon: 'trophy',
        color: 'gold',
        condition_type: 'perfect_score',
        condition_value: 100
      },
      {
        name: '継続学習者',
        description: '7日連続で学習',
        icon: 'flame',
        color: 'orange',
        condition_type: 'streak',
        condition_value: 7
      },
      {
        name: '熟練者',
        description: '50問セット完了',
        icon: 'star',
        color: 'blue',
        condition_type: 'total_completed',
        condition_value: 50
      }
    ]

    const { data: insertedBadges, error: badgesError } = await adminClient
      .from('badges')
      .insert(badgesData)
      .select()

    if (badgesError) {
      results.push({ step: 'badges', status: 'failed', error: badgesError.message })
    } else {
      results.push({ step: 'badges', status: 'success', count: insertedBadges?.length })
    }

    return NextResponse.json({
      success: true,
      message: '🎉 救急救命士国家試験対策アプリのデータベースが完成しました！',
      results
    })

  } catch (error: any) {
    console.error('Schema creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}
