import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 救急救命士国家試験問題の大量投入を開始します...')
    const adminClient = createServerClient()
    
    const results: any[] = []

    // 1. 既存の問題セットと問題をクリア
    await adminClient.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await adminClient.from('question_sets').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 2. カテゴリーを取得
    const { data: categories, error: categoriesError } = await adminClient
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true })

    if (categoriesError || !categories) {
      return NextResponse.json({ success: false, error: 'カテゴリーの取得に失敗しました' }, { status: 500 })
    }

    // 3. 問題セットを作成（正しいスキーマ）
    const questionSetsData = categories.map((category) => ({
      category_id: category.id,
      name: `${category.name}基礎`
    }))

    const { data: questionSets, error: questionSetsError } = await adminClient
      .from('question_sets')
      .insert(questionSetsData)
      .select()

    if (questionSetsError) {
      results.push({ step: 'question_sets', status: 'failed', error: questionSetsError.message })
      return NextResponse.json({ success: false, results }, { status: 500 })
    } else {
      results.push({ step: 'question_sets', status: 'success', count: questionSets?.length })
    }

    // 4. 問題データを準備
    const questionsData = []

    // 心肺蘇生法の問題
    const cprQuestionSetId = questionSets.find(qs => qs.name.includes('心肺蘇生法'))?.id
    if (cprQuestionSetId) {
      questionsData.push(
        {
          question_set_id: cprQuestionSetId,
          question_number: 1,
          question_text: '成人の心肺蘇生において、胸骨圧迫の深さはどのくらいが適切ですか？',
          options: ['3-4cm', '5-6cm', '7-8cm', '9-10cm'],
          correct_answers: [1]
        },
        {
          question_set_id: cprQuestionSetId,
          question_number: 2,
          question_text: '成人の心肺蘇生において、胸骨圧迫の速度は1分間に何回が適切ですか？',
          options: ['80-90回', '100-120回', '120-140回', '140-160回'],
          correct_answers: [1]
        },
        {
          question_set_id: cprQuestionSetId,
          question_number: 3,
          question_text: '成人の心肺蘇生において、人工呼吸と胸骨圧迫の比率は？',
          options: ['1:15', '2:30', '2:15', '1:30'],
          correct_answers: [1]
        },
        {
          question_set_id: cprQuestionSetId,
          question_number: 4,
          question_text: 'AEDの使用において、電気ショックの前に行うべきことは？',
          options: ['胸骨圧迫の継続', '患者から離れることの確認', '人工呼吸の実施', '脈拍の確認'],
          correct_answers: [1]
        },
        {
          question_set_id: cprQuestionSetId,
          question_number: 5,
          question_text: '心停止の判断において、確認すべき項目として適切でないものは？',
          options: ['意識の確認', '呼吸の確認', '血圧の測定', '脈拍の確認'],
          correct_answers: [2]
        }
      )
    }

    // 薬理学の問題
    const pharmacologyQuestionSetId = questionSets.find(qs => qs.title.includes('薬理学'))?.id
    if (pharmacologyQuestionSetId) {
      questionsData.push(
        {
          question_set_id: pharmacologyQuestionSetId,
          question_text: 'アドレナリンの主な作用機序は何ですか？',
          option_a: 'β受容体遮断',
          option_b: 'α・β受容体刺激',
          option_c: 'カルシウム拮抗',
          option_d: 'ACE阻害',
          correct_answer: 'B'
        },
        {
          question_set_id: pharmacologyQuestionSetId,
          question_text: 'アドレナリンの投与経路として適切なものは？',
          option_a: '経口投与のみ',
          option_b: '静脈内投与のみ',
          option_c: '静脈内・気管内投与',
          option_d: '筋肉内投与のみ',
          correct_answer: 'C'
        },
        {
          question_set_id: pharmacologyQuestionSetId,
          question_text: 'アトロピンの主な適応症は？',
          option_a: '頻脈',
          option_b: '徐脈',
          option_c: '高血圧',
          option_d: '低血圧',
          correct_answer: 'B'
        },
        {
          question_set_id: pharmacologyQuestionSetId,
          question_text: 'リドカインの主な作用は？',
          option_a: '血管拡張',
          option_b: '血管収縮',
          option_c: '抗不整脈',
          option_d: '利尿',
          correct_answer: 'C'
        },
        {
          question_set_id: pharmacologyQuestionSetId,
          question_text: 'ニトログリセリンの主な作用は？',
          option_a: '心収縮力増強',
          option_b: '血管拡張',
          option_c: '気管支拡張',
          option_d: '利尿',
          correct_answer: 'B'
        }
      )
    }

    // 外傷処置の問題
    const traumaQuestionSetId = questionSets.find(qs => qs.title.includes('外傷処置'))?.id
    if (traumaQuestionSetId) {
      questionsData.push(
        {
          question_set_id: traumaQuestionSetId,
          question_text: '外傷患者の初期評価で最初に確認すべきことは何ですか？',
          option_a: '意識レベル',
          option_b: '気道の確保',
          option_c: '呼吸状態',
          option_d: '循環状態',
          correct_answer: 'B'
        },
        {
          question_set_id: traumaQuestionSetId,
          question_text: 'ABCDEアプローチのDは何を表しますか？',
          option_a: 'Drug（薬物）',
          option_b: 'Disability（神経学的評価）',
          option_c: 'Diagnosis（診断）',
          option_d: 'Decision（決定）',
          correct_answer: 'B'
        },
        {
          question_set_id: traumaQuestionSetId,
          question_text: '開放性気胸の応急処置として適切なものは？',
          option_a: '創部の完全閉鎖',
          option_b: '片弁弁（フラップバルブ）',
          option_c: '創部の開放',
          option_d: '胸腔ドレナージ',
          correct_answer: 'B'
        },
        {
          question_set_id: traumaQuestionSetId,
          question_text: '大量出血の止血法として最も有効なものは？',
          option_a: '直接圧迫止血',
          option_b: '間接圧迫止血',
          option_c: '止血帯法',
          option_d: '挙上法',
          correct_answer: 'A'
        },
        {
          question_set_id: traumaQuestionSetId,
          question_text: 'ショック症状として現れにくいものは？',
          option_a: '頻脈',
          option_b: '血圧低下',
          option_c: '発熱',
          option_d: '冷汗',
          correct_answer: 'C'
        }
      )
    }

    // 呼吸器疾患の問題
    const respiratoryQuestionSetId = questionSets.find(qs => qs.title.includes('呼吸器疾患'))?.id
    if (respiratoryQuestionSetId) {
      questionsData.push(
        {
          question_set_id: respiratoryQuestionSetId,
          question_text: '呼吸困難の患者で最も緊急性が高いのはどの状態ですか？',
          option_a: 'SpO2 95%',
          option_b: 'チアノーゼの出現',
          option_c: '呼吸数30回/分',
          option_d: '起座呼吸',
          correct_answer: 'B'
        },
        {
          question_set_id: respiratoryQuestionSetId,
          question_text: '気管支喘息の急性発作時の処置として適切でないものは？',
          option_a: '酸素投与',
          option_b: '気管支拡張薬の投与',
          option_c: '体位は座位',
          option_d: '大量輸液',
          correct_answer: 'D'
        },
        {
          question_set_id: respiratoryQuestionSetId,
          question_text: '緊張性気胸の典型的な徴候として適切でないものは？',
          option_a: '患側の呼吸音減弱',
          option_b: '気管の健側偏位',
          option_c: '頸静脈怒張',
          option_d: '患側の胸郭拡大',
          correct_answer: 'D'
        },
        {
          question_set_id: respiratoryQuestionSetId,
          question_text: '肺水腫の典型的な症状として適切でないものは？',
          option_a: '起座呼吸',
          option_b: '泡沫状痰',
          option_c: '湿性ラ音',
          option_d: '乾性咳嗽',
          correct_answer: 'D'
        },
        {
          question_set_id: respiratoryQuestionSetId,
          question_text: '過換気症候群の対処法として適切なものは？',
          option_a: '酸素マスクの装着',
          option_b: 'ペーパーバッグ法',
          option_c: '気管挿管',
          option_d: '気管支拡張薬投与',
          correct_answer: 'B'
        }
      )
    }

    // 循環器疾患の問題
    const cardiacQuestionSetId = questionSets.find(qs => qs.title.includes('循環器疾患'))?.id
    if (cardiacQuestionSetId) {
      questionsData.push(
        {
          question_set_id: cardiacQuestionSetId,
          question_text: '急性心筋梗塞の典型的な症状はどれですか？',
          option_a: '鋭い刺すような痛み',
          option_b: '圧迫感のある胸部痛',
          option_c: '呼吸に伴う痛み',
          option_d: '体位変換で軽減する痛み',
          correct_answer: 'B'
        },
        {
          question_set_id: cardiacQuestionSetId,
          question_text: '急性心筋梗塞の疑いがある患者への初期対応として適切でないものは？',
          option_a: '酸素投与',
          option_b: '安静',
          option_c: '大量輸液',
          option_d: '心電図モニター',
          correct_answer: 'C'
        },
        {
          question_set_id: cardiacQuestionSetId,
          question_text: '心房細動の心電図所見として特徴的なものは？',
          option_a: 'P波の消失',
          option_b: 'QRS幅の拡大',
          option_c: 'ST上昇',
          option_d: 'T波の陰転',
          correct_answer: 'A'
        },
        {
          question_set_id: cardiacQuestionSetId,
          question_text: '心原性ショックの症状として適切でないものは？',
          option_a: '血圧低下',
          option_b: '頻脈',
          option_c: '温かい皮膚',
          option_d: '尿量減少',
          correct_answer: 'C'
        },
        {
          question_set_id: cardiacQuestionSetId,
          question_text: '大動脈解離の典型的な症状は？',
          option_a: '徐々に増強する胸痛',
          option_b: '突然発症の激烈な胸背部痛',
          option_c: '労作時胸痛',
          option_d: '体位により変化する胸痛',
          correct_answer: 'B'
        }
      )
    }

    // 法規・制度の問題
    const legalQuestionSetId = questionSets.find(qs => qs.title.includes('法規・制度'))?.id
    if (legalQuestionSetId) {
      questionsData.push(
        {
          question_set_id: legalQuestionSetId,
          question_text: '救急救命士が実施できる特定行為はどれですか？',
          option_a: '気管挿管',
          option_b: '薬剤投与',
          option_c: '除細動',
          option_d: 'すべて',
          correct_answer: 'D'
        },
        {
          question_set_id: legalQuestionSetId,
          question_text: '救急救命士法が制定された年は？',
          option_a: '1991年',
          option_b: '1992年',
          option_c: '1993年',
          option_d: '1994年',
          correct_answer: 'A'
        },
        {
          question_set_id: legalQuestionSetId,
          question_text: '救急救命士の資格更新に必要な再教育時間は？',
          option_a: '20時間',
          option_b: '30時間',
          option_c: '40時間',
          option_d: '50時間',
          correct_answer: 'B'
        },
        {
          question_set_id: legalQuestionSetId,
          question_text: '救急救命士が薬剤投与を行う際に必要なものは？',
          option_a: '家族の同意',
          option_b: '医師の指示',
          option_c: '患者の同意',
          option_d: '消防署長の許可',
          correct_answer: 'B'
        },
        {
          question_set_id: legalQuestionSetId,
          question_text: '救急救命士の業務範囲として適切でないものは？',
          option_a: '心電図12誘導の解読',
          option_b: '血液検査の実施',
          option_c: '静脈路確保',
          option_d: '血糖測定',
          correct_answer: 'B'
        }
      )
    }

    // 5. 問題を投入
    if (questionsData.length > 0) {
      const { data: insertedQuestions, error: questionsError } = await adminClient
        .from('questions')
        .insert(questionsData)
        .select()

      if (questionsError) {
        results.push({ step: 'questions', status: 'failed', error: questionsError.message })
      } else {
        results.push({ step: 'questions', status: 'success', count: insertedQuestions?.length })

        // 各カテゴリーの問題数を更新
        for (const category of categories) {
          const categoryQuestionSets = questionSets.filter(qs => qs.category_id === category.id)
          const questionSetIds = categoryQuestionSets.map(qs => qs.id)

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

    return NextResponse.json({
      success: true,
      message: '🎉 救急救命士国家試験問題の大量投入が完了しました！',
      summary: {
        categories: categories.length,
        question_sets: questionSets?.length || 0,
        total_questions: questionsData.length
      },
      results
    })

  } catch (error: any) {
    console.error('Questions import error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}
