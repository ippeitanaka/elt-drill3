import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 既存データを活用して救急救命士データベースを完成させます...')
    const adminClient = createServerClient()
    
    const results: any[] = []

    // 1. 既存の「心肺停止」を「心肺蘇生法」に更新
    const { error: updateError } = await adminClient
      .from('categories')
      .update({ name: '心肺蘇生法' })
      .eq('name', '心肺停止')

    if (updateError) {
      results.push({ step: 'update_existing', status: 'failed', error: updateError.message })
    } else {
      results.push({ step: 'update_existing', status: 'success' })
    }

    // 2. 新しいカテゴリーを追加（重複チェック付き）
    const newCategories = ['薬理学', '外傷処置', '呼吸器疾患', '循環器疾患', '法規・制度']
    const insertedCategoryIds: any[] = []

    for (const categoryName of newCategories) {
      const { data: existing } = await adminClient
        .from('categories')
        .select('id')
        .eq('name', categoryName)
        .single()

      if (!existing) {
        const { data: inserted, error: insertError } = await adminClient
          .from('categories')
          .insert({ name: categoryName })
          .select()
          .single()

        if (insertError) {
          results.push({ step: `insert_${categoryName}`, status: 'failed', error: insertError.message })
        } else {
          insertedCategoryIds.push(inserted)
          results.push({ step: `insert_${categoryName}`, status: 'success' })
        }
      }
    }

    // 3. すべてのカテゴリーを取得
    const { data: allCategories, error: getAllError } = await adminClient
      .from('categories')
      .select('*')

    if (getAllError) {
      results.push({ step: 'get_all_categories', status: 'failed', error: getAllError.message })
      return NextResponse.json({ success: false, results })
    }

    results.push({ step: 'get_all_categories', status: 'success', count: allCategories?.length })

    // 4. 問題セットを作成
    if (allCategories && allCategories.length > 0) {
      const questionSetsData = allCategories.map((category, index) => ({
        category_id: category.id,
        title: `${category.name}基礎`,
        order_index: index + 1
      }))

      const { data: insertedQuestionSets, error: questionSetsError } = await adminClient
        .from('question_sets')
        .insert(questionSetsData)
        .select()

      if (questionSetsError) {
        results.push({ step: 'question_sets', status: 'failed', error: questionSetsError.message })
      } else {
        results.push({ step: 'question_sets', status: 'success', count: insertedQuestionSets?.length })

        // 5. サンプル問題を作成
        if (insertedQuestionSets && insertedQuestionSets.length > 0) {
          const questionsData = [
            {
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('心肺蘇生法'))?.id,
              question_text: '成人の心肺蘇生において、胸骨圧迫の深さはどのくらいが適切ですか？',
              option_a: '3-4cm',
              option_b: '5-6cm',
              option_c: '7-8cm',
              option_d: '9-10cm',
              correct_answer: 'B'
            },
            {
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('薬理学'))?.id,
              question_text: 'アドレナリンの主な作用機序は何ですか？',
              option_a: 'β受容体遮断',
              option_b: 'α・β受容体刺激',
              option_c: 'カルシウム拮抗',
              option_d: 'ACE阻害',
              correct_answer: 'B'
            },
            {
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('外傷処置'))?.id,
              question_text: '外傷患者の初期評価で最初に確認すべきことは何ですか？',
              option_a: '意識レベル',
              option_b: '気道の確保',
              option_c: '呼吸状態',
              option_d: '循環状態',
              correct_answer: 'B'
            },
            {
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('呼吸器疾患'))?.id,
              question_text: '呼吸困難の患者で最も緊急性が高いのはどの状態ですか？',
              option_a: 'SpO2 95%',
              option_b: 'チアノーゼの出現',
              option_c: '呼吸数30回/分',
              option_d: '起座呼吸',
              correct_answer: 'B'
            },
            {
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('循環器疾患'))?.id,
              question_text: '急性心筋梗塞の典型的な症状はどれですか？',
              option_a: '鋭い刺すような痛み',
              option_b: '圧迫感のある胸部痛',
              option_c: '呼吸に伴う痛み',
              option_d: '体位変換で軽減する痛み',
              correct_answer: 'B'
            },
            {
              question_set_id: insertedQuestionSets.find(qs => qs.title.includes('法規・制度'))?.id,
              question_text: '救急救命士が実施できる特定行為はどれですか？',
              option_a: '気管挿管',
              option_b: '薬剤投与',
              option_c: '除細動',
              option_d: 'すべて',
              correct_answer: 'D'
            }
          ].filter(q => q.question_set_id)

          const { data: insertedQuestions, error: questionsError } = await adminClient
            .from('questions')
            .insert(questionsData)
            .select()

          if (questionsError) {
            results.push({ step: 'questions', status: 'failed', error: questionsError.message })
          } else {
            results.push({ step: 'questions', status: 'success', count: insertedQuestions?.length })
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '🎉 救急救命士国家試験対策アプリのデータベースが完成しました！',
      summary: {
        categories: allCategories?.length || 0,
        questions: results.find(r => r.step === 'questions')?.count || 0
      },
      results
    })

  } catch (error: any) {
    console.error('Database completion error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}
