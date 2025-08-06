import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const adminClient = createServerClient()
    
    // より多くの心肺停止の問題を追加（469問のPDFを模擬）
    const heartStopQuestions = [
      {
        question_text: "心停止の確認方法として適切なのはどれか。",
        options: ["呼吸の確認のみ", "脈拍の確認のみ", "意識・呼吸・脈拍の確認", "血圧測定"],
        correct_answers: [2],
        question_number: 1
      },
      {
        question_text: "成人の胸骨圧迫において、圧迫点はどこか。",
        options: ["胸骨上端", "胸骨下半分", "左胸部", "右胸部"],
        correct_answers: [1],
        question_number: 2
      },
      {
        question_text: "胸骨圧迫の深さとして適切なのはどれか。",
        options: ["少なくとも5cm", "少なくとも6cm", "少なくとも7cm", "少なくとも8cm"],
        correct_answers: [0],
        question_number: 3
      },
      {
        question_text: "胸骨圧迫の速度として適切なのはどれか。",
        options: ["80-100回/分", "100-120回/分", "120-140回/分", "140-160回/分"],
        correct_answers: [1],
        question_number: 4
      },
      {
        question_text: "人工呼吸と胸骨圧迫の比率として適切なのはどれか。",
        options: ["1:15", "2:30", "1:30", "2:15"],
        correct_answers: [1],
        question_number: 5
      },
      {
        question_text: "AEDの電極パッドの貼付位置として適切なのはどれか。",
        options: ["両胸部", "右胸部上部と左胸部下部", "左胸部上部と右胸部下部", "背中と胸部"],
        correct_answers: [1],
        question_number: 6
      },
      {
        question_text: "電気ショック実施前に確認すべき事項はどれか。",
        options: ["脈拍の確認", "呼吸の確認", "患者から離れることの確認", "血圧の確認"],
        correct_answers: [2],
        question_number: 7
      },
      {
        question_text: "CPRの中断時間として適切なのはどれか。",
        options: ["最小限（10秒以内）", "30秒以内", "1分以内", "制限なし"],
        correct_answers: [0],
        question_number: 8
      },
      {
        question_text: "心停止患者への薬物投与経路として第一選択はどれか。",
        options: ["経口", "静脈内", "気管内", "筋肉内"],
        correct_answers: [1],
        question_number: 9
      },
      {
        question_text: "アドレナリンの投与量として適切なのはどれか（成人）。",
        options: ["0.5mg", "1mg", "1.5mg", "2mg"],
        correct_answers: [1],
        question_number: 10
      },
      {
        question_text: "心停止の原因として最も多いのはどれか。",
        options: ["心室細動", "心房細動", "心静止", "無脈性電気活動"],
        correct_answers: [0],
        question_number: 11
      },
      {
        question_text: "蘇生処置の継続時間として適切なのはどれか。",
        options: ["10分", "20分", "30分", "医師の判断まで継続"],
        correct_answers: [3],
        question_number: 12
      },
      {
        question_text: "体温管理で目標温度として適切なのはどれか。",
        options: ["32-34℃", "34-36℃", "36-37℃", "37-38℃"],
        correct_answers: [1],
        question_number: 13
      },
      {
        question_text: "蘇生後の神経学的予後評価で重要なのはどれか。",
        options: ["心電図変化", "血圧変動", "意識レベル", "呼吸パターン"],
        correct_answers: [2],
        question_number: 14
      },
      {
        question_text: "小児（1歳以上）の胸骨圧迫の深さはどれか。",
        options: ["胸郭径の1/4", "胸郭径の1/3", "胸郭径の1/2", "成人と同じ"],
        correct_answers: [1],
        question_number: 15
      }
    ]

    // カテゴリー27（心肺停止）用の追加問題セットを作成
    const { data: questionSet, error: setError } = await adminClient
      .from('question_sets')
      .insert([{
        category_id: 27,
        name: "心肺停止 - 詳細問題集 (バッチ処理テスト)"
      }])
      .select()
      .single()

    if (setError) {
      throw new Error(`問題セット作成エラー: ${setError.message}`)
    }

    // 問題を保存
    const questionsToInsert = heartStopQuestions.map(q => ({
      question_set_id: questionSet.id,
      question_number: q.question_number,
      question_text: q.question_text,
      options: q.options,
      correct_answers: q.correct_answers
    }))

    const { error: questionsError } = await adminClient
      .from('questions')
      .insert(questionsToInsert)

    if (questionsError) {
      throw new Error(`問題保存エラー: ${questionsError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: `心肺停止カテゴリーに${heartStopQuestions.length}問を追加しました (バッチ処理テスト)`,
      data: {
        questionSetId: questionSet.id,
        questionsAdded: heartStopQuestions.length,
        totalQuestions: heartStopQuestions.length
      }
    })

  } catch (error: any) {
    console.error('バッチテスト問題追加エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
