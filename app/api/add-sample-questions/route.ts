import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const adminClient = createServerClient()
    
    console.log('🚀 サンプル問題大量追加開始...')
    
    // 各カテゴリーの取得
    const { data: categories, error: categoriesError } = await adminClient
      .from('categories')
      .select('*')
    
    if (categoriesError) {
      throw new Error(`カテゴリー取得エラー: ${categoriesError.message}`)
    }
    
    console.log(`📁 カテゴリー数: ${categories?.length || 0}`)
    
    const allQuestions = []
    let questionSetCounter = 100 // 既存のIDと重複しないように開始
    
    // 各カテゴリーに対してサンプル問題を生成
    for (const category of categories || []) {
      console.log(`📚 カテゴリー "${category.name}" に問題を追加中...`)
      
      // 問題セットを作成
      const { data: questionSet, error: setError } = await adminClient
        .from('question_sets')
        .insert({
          category_id: category.id,
          name: `${category.name} - サンプル問題集`,
          total_questions: 10
        })
        .select()
        .single()
      
      if (setError) {
        console.error(`問題セット作成エラー (${category.name}):`, setError)
        continue
      }
      
      console.log(`✅ 問題セット作成完了: ${questionSet.id}`)
      
      // 各カテゴリーに10問のサンプル問題を追加
      const questionsToAdd = []
      
      for (let i = 1; i <= 10; i++) {
        const sampleQuestions = {
          '心肺蘇生法': [
            {
              text: `心肺蘇生法の基本手順において、胸骨圧迫の深さは成人の場合何cmが適切ですか？（問題${i}）`,
              options: {
                a: '3-4cm',
                b: '5-6cm',
                c: '7-8cm',
                d: '9-10cm',
                e: '1-2cm'
              },
              correct: 'b'
            }
          ],
          '薬理学': [
            {
              text: `アドレナリンの主な作用機序について、最も適切な説明はどれですか？（問題${i}）`,
              options: {
                a: 'α受容体のみに作用',
                b: 'β受容体のみに作用',
                c: 'α・β受容体両方に作用',
                d: 'ムスカリン受容体に作用',
                e: 'GABA受容体に作用'
              },
              correct: 'c'
            }
          ],
          '外傷処置': [
            {
              text: `出血時の止血法において、最初に行うべき処置はどれですか？（問題${i}）`,
              options: {
                a: '圧迫止血',
                b: '止血帯使用',
                c: '縫合',
                d: '止血剤投与',
                e: '冷却'
              },
              correct: 'a'
            }
          ],
          '呼吸器疾患': [
            {
              text: `気管挿管の適応として、最も適切なのはどれですか？（問題${i}）`,
              options: {
                a: '軽度の呼吸困難',
                b: '意識レベル低下による気道確保困難',
                c: '軽微な外傷',
                d: '血圧上昇',
                e: '発熱のみ'
              },
              correct: 'b'
            }
          ],
          '循環器疾患': [
            {
              text: `急性心筋梗塞の典型的な症状として、最も特徴的なのはどれですか？（問題${i}）`,
              options: {
                a: '軽度の胸部違和感',
                b: '激しい胸痛と冷汗',
                c: '軽度の息切れ',
                d: '足のむくみ',
                e: '軽度の発熱'
              },
              correct: 'b'
            }
          ],
          '法規・制度': [
            {
              text: `救急救命士の業務範囲について、正しい記述はどれですか？（問題${i}）`,
              options: {
                a: '医師の具体的指示なしに薬剤投与可能',
                b: '医師の指示下で特定行為が可能',
                c: '手術の執刀が可能',
                d: '診断書の作成が可能',
                e: '処方箋の発行が可能'
              },
              correct: 'b'
            }
          ],
          '心肺停止': [
            {
              text: `心肺停止患者への対応で、最も優先すべき処置はどれですか？（問題${i}）`,
              options: {
                a: '静脈路確保',
                b: '気管挿管',
                c: '胸骨圧迫',
                d: '薬剤投与',
                e: '心電図装着'
              },
              correct: 'c'
            }
          ]
        }
        
        const categoryQuestions = sampleQuestions[category.name as keyof typeof sampleQuestions] || sampleQuestions['心肺蘇生法']
        const questionData = categoryQuestions[0]
        
        questionsToAdd.push({
          question_set_id: questionSet.id,
          category_id: category.id,
          question_number: i,
          question_text: questionData.text,
          options: JSON.stringify(questionData.options),
          correct_answers: JSON.stringify([questionData.correct])
        })
      }
      
      // バッチで問題を挿入
      const { error: questionsError } = await adminClient
        .from('questions')
        .insert(questionsToAdd)
      
      if (questionsError) {
        console.error(`問題挿入エラー (${category.name}):`, questionsError)
      } else {
        console.log(`✅ ${category.name}: ${questionsToAdd.length}問追加完了`)
        allQuestions.push(...questionsToAdd)
      }
    }
    
    // カテゴリーの問題数を更新
    for (const category of categories || []) {
      const { count } = await adminClient
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category.id)
      
      await adminClient
        .from('categories')
        .update({ question_count: count || 0 })
        .eq('id', category.id)
      
      console.log(`📊 カテゴリー "${category.name}": ${count}問に更新`)
    }
    
    return NextResponse.json({
      success: true,
      message: `${allQuestions.length}問のサンプル問題を追加しました`,
      data: {
        totalQuestionsAdded: allQuestions.length,
        categoriesProcessed: categories?.length || 0,
        questionsPerCategory: 10
      }
    })
    
  } catch (error: any) {
    console.error('❌ サンプル問題追加エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
