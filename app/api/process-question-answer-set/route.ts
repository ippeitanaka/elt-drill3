import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractTextFromPDF } from '@/lib/ocr-enhanced'
import { 
  parseMedicalQuestions, 
  parseAnswerPDF, 
  combineQuestionsAndAnswers,
  detectMedicalCategory, 
  type MedicalQuestion,
  type AnswerSet 
} from '@/lib/medical-question-parser'

export async function POST(request: NextRequest) {
  console.log('🏥 問題+解答PDFセット処理API開始')
  
  try {
    const adminClient = createServerClient()
    const formData = await request.formData()
    
    const questionFile = formData.get('questionFile') as File
    const answerFile = formData.get('answerFile') as File
    const categoryId = formData.get('categoryId') as string | null
    const autoDetectCategory = formData.get('autoDetectCategory') === 'true'
    
    if (!questionFile || !answerFile) {
      return NextResponse.json(
        { error: '問題PDFと解答PDFの両方が必要です' },
        { status: 400 }
      )
    }
    
    console.log(`📄 処理対象ファイル:`)
    console.log(`  問題PDF: ${questionFile.name} (${questionFile.size} bytes)`)
    console.log(`  解答PDF: ${answerFile.name} (${answerFile.size} bytes)`)
    
    // Step 1: 問題PDFからテキストを抽出
    console.log('🔍 問題PDFテキスト抽出開始...')
    const questionText = await extractTextFromPDF(questionFile)
    
    if (!questionText || questionText.trim().length < 50) {
      return NextResponse.json({
        success: false,
        error: '問題PDFから十分なテキストを抽出できませんでした',
        extractedText: questionText || '',
        recommendations: [
          'より高解像度の問題PDFファイルを使用してください',
          'テキスト形式のPDFファイルに変換してください',
          '画像品質を改善してください'
        ]
      })
    }
    
    console.log(`✅ 問題PDFテキスト抽出完了: ${questionText.length}文字`)
    
    // Step 2: 解答PDFからテキストを抽出
    console.log('🔍 解答PDFテキスト抽出開始...')
    const answerText = await extractTextFromPDF(answerFile)
    
    if (!answerText || answerText.trim().length < 10) {
      return NextResponse.json({
        success: false,
        error: '解答PDFから十分なテキストを抽出できませんでした',
        extractedText: answerText || '',
        recommendations: [
          'より高解像度の解答PDFファイルを使用してください',
          'テキスト形式のPDFファイルに変換してください',
          '解答が明確に記載されているPDFを使用してください'
        ]
      })
    }
    
    console.log(`✅ 解答PDFテキスト抽出完了: ${answerText.length}文字`)
    
    // Step 3: 問題を解析
    console.log('🏥 医療問題解析開始...')
    const medicalQuizSet = parseMedicalQuestions(questionText)
    
    if (medicalQuizSet.questions.length === 0) {
      return NextResponse.json({
        success: false,
        error: '医療問題として解析できませんでした',
        extractedText: questionText.substring(0, 1000) + '...',
        textLength: questionText.length,
        analysis: {
          hasNumbers: /\d+/.test(questionText),
          hasChoices: /[1-5ア-オa-eA-E]\s*[．.\)）]/.test(questionText),
          hasMedicalTerms: /(?:患者|症例|治療|診断|薬物|投与|症状|疾患)/.test(questionText),
          hasQuestionMarkers: /(?:問題?|Question|Q)\s*\d+/.test(questionText)
        },
        recommendations: [
          '問題番号が明確に記載されているか確認してください（例: 問1、Q1、1.）',
          '選択肢が明確に記載されているか確認してください（例: 1. 2. 3. 4. 5.）',
          '医療専門用語が含まれているか確認してください',
          'PDF品質を向上させてください'
        ]
      })
    }
    
    console.log(`🎯 医療問題解析完了: ${medicalQuizSet.questions.length}問を抽出`)
    
    // Step 4: 解答を解析
    console.log('📋 解答解析開始...')
    const answerSet = parseAnswerPDF(answerText)
    
    if (answerSet.totalAnswers === 0) {
      return NextResponse.json({
        success: false,
        error: '解答PDFから解答を抽出できませんでした',
        extractedText: answerText.substring(0, 1000) + '...',
        textLength: answerText.length,
        questionCount: medicalQuizSet.questions.length,
        recommendations: [
          '解答が「問1 答え：1」「1. a」などの形式で記載されているか確認してください',
          '問題番号と解答が明確に対応しているか確認してください',
          '解答PDFの画像品質を向上させてください',
          '別の解答PDFを試してください'
        ]
      })
    }
    
    console.log(`📋 解答解析完了: ${answerSet.totalAnswers}問の解答を抽出`)
    
    // Step 5: 問題と解答を結合
    console.log('🔗 問題と解答を結合開始...')
    const combinedQuizSet = combineQuestionsAndAnswers(medicalQuizSet, answerSet)
    
    const questionsWithAnswers = combinedQuizSet.questions.filter(q => q.correctAnswer).length
    
    if (questionsWithAnswers === 0) {
      return NextResponse.json({
        success: false,
        error: '問題と解答を正しく結合できませんでした',
        details: {
          extractedQuestions: medicalQuizSet.questions.length,
          extractedAnswers: answerSet.totalAnswers,
          combinedQuestions: questionsWithAnswers,
          questionNumbers: medicalQuizSet.questions.map(q => q.questionNumber),
          answerNumbers: Object.keys(answerSet.answers).map(n => parseInt(n))
        },
        recommendations: [
          '問題PDFと解答PDFの問題番号が一致しているか確認してください',
          '解答PDFの番号付けが正確か確認してください',
          '同じ試験・年度の問題と解答PDFを使用していることを確認してください'
        ]
      })
    }
    
    console.log(`🔗 問題と解答結合完了: ${questionsWithAnswers}問に正解を設定`)
    
    // Step 6: データベースに保存
    let targetCategoryId = categoryId
    
    // カテゴリー自動検出
    if (autoDetectCategory && combinedQuizSet.questions.length > 0) {
      const firstQuestionText = combinedQuizSet.questions[0].questionText
      const detectedCategory = detectMedicalCategory(firstQuestionText)
      
      console.log(`🔍 カテゴリー自動検出: ${detectedCategory}`)
      
      // カテゴリー名からIDを取得
      const { data: categories } = await adminClient
        .from('categories')
        .select('id')
        .eq('name', detectedCategory)
        .single()
      
      if (categories) {
        targetCategoryId = categories.id.toString()
        console.log(`✅ 自動検出カテゴリーID: ${targetCategoryId}`)
      }
    }
    
    if (!targetCategoryId) {
      // デフォルトカテゴリーを使用
      const { data: defaultCategory } = await adminClient
        .from('categories')
        .select('id')
        .eq('name', '心肺蘇生法')
        .single()
      
      targetCategoryId = defaultCategory?.id?.toString() || '19'
    }
    
    // 問題セットを作成
    const { data: questionSet, error: questionSetError } = await adminClient
      .from('question_sets')
      .insert({
        category_id: parseInt(targetCategoryId!),
        name: `医療問題セット - ${new Date().toLocaleDateString('ja-JP')} (${questionFile.name})`
      })
      .select()
      .single()
    
    if (questionSetError) {
      console.error('❌ 問題セット作成エラー:', questionSetError)
      throw new Error(`問題セット作成エラー: ${questionSetError.message}`)
    }
    
    console.log(`📚 問題セット作成完了: ID ${questionSet.id}`)
    
    // 各問題を保存
    const savedQuestions = []
    for (let i = 0; i < combinedQuizSet.questions.length; i++) {
      const question = combinedQuizSet.questions[i]
      
      try {
        console.log(`💾 問題${i + 1}を保存中...`)
        
        // 選択肢をJSON形式に変換
        const options = JSON.stringify(question.choices)
        const correctAnswers = question.correctAnswer ? [question.correctAnswer] : []
        
        const { data: savedQuestion, error: questionError } = await adminClient
          .from('questions')
          .insert({
            question_set_id: questionSet.id,
            question_number: question.questionNumber || (i + 1),
            question_text: question.questionText,
            options: options,
            correct_answers: JSON.stringify(correctAnswers)
          })
          .select()
          .single()
        
        if (questionError) {
          console.error(`❌ 問題${i + 1}保存エラー:`, questionError)
          continue
        }
        
        savedQuestions.push(savedQuestion)
        console.log(`✅ 問題${i + 1}保存完了${question.correctAnswer ? ' (正解あり)' : ' (正解なし)'}`)
        
      } catch (questionSaveError: any) {
        console.error(`❌ 問題${i + 1}保存例外:`, questionSaveError)
        continue
      }
    }
    
    // カテゴリーの問題数を更新
    try {
      const { data: questionCount } = await adminClient
        .from('questions')
        .select('id', { count: 'exact' })
        .eq('question_set_id', questionSet.id)
      
      if (questionCount) {
        await adminClient
          .from('categories')
          .update({ question_count: questionCount.length })
          .eq('id', targetCategoryId)
      }
    } catch (updateError: any) {
      console.warn('⚠️ カテゴリー問題数更新エラー:', updateError)
    }
    
    console.log(`🎉 医療問題+解答セット処理完了: ${savedQuestions.length}問を保存`)
    
    return NextResponse.json({
      success: true,
      data: {
        totalExtractedQuestions: combinedQuizSet.questions.length,
        totalExtractedAnswers: answerSet.totalAnswers,
        totalSaved: savedQuestions.length,
        questionsWithAnswers: questionsWithAnswers,
        categoryId: targetCategoryId,
        questionSetId: questionSet.id,
        questions: combinedQuizSet.questions.map((q, index) => ({
          number: q.questionNumber || (index + 1),
          text: q.questionText.substring(0, 100) + '...',
          choicesCount: Object.keys(q.choices).length,
          hasCorrectAnswer: !!q.correctAnswer,
          correctAnswer: q.correctAnswer || null
        }))
      },
      extractedTexts: {
        question: questionText.substring(0, 500) + '...',
        answer: answerText.substring(0, 500) + '...'
      },
      textLengths: {
        question: questionText.length,
        answer: answerText.length
      },
      message: `${savedQuestions.length}問の医療問題（${questionsWithAnswers}問に正解あり）を正常に抽出・保存しました`
    })
    
  } catch (error: any) {
    console.error('❌ 医療問題+解答セット処理エラー:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || '内部サーバーエラー',
        details: error.stack
      },
      { status: 500 }
    )
  }
}
