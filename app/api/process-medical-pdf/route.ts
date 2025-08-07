import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractTextFromPDF } from '@/lib/ocr-enhanced'
import { parseMedicalQuestions, detectMedicalCategory, type MedicalQuestion } from '@/lib/medical-question-parser'

export async function POST(request: NextRequest) {
  console.log('🏥 医療問題OCR処理API開始')
  
  try {
    const adminClient = createServerClient()
    const formData = await request.formData()
    
    const pdfFile = formData.get('pdfFile') as File
    const categoryId = formData.get('categoryId') as string | null
    const autoDetectCategory = formData.get('autoDetectCategory') === 'true'
    
    if (!pdfFile) {
      return NextResponse.json(
        { error: 'PDFファイルが必要です' },
        { status: 400 }
      )
    }
    
    console.log(`📄 処理対象ファイル: ${pdfFile.name} (${pdfFile.size} bytes)`)
    
    // Step 1: PDFからテキストを抽出
    console.log('🔍 PDFテキスト抽出開始...')
    const extractedText = await extractTextFromPDF(pdfFile)
    
    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json({
        success: false,
        error: 'PDFから十分なテキストを抽出できませんでした',
        extractedText: extractedText || '',
        recommendations: [
          'より高解像度のPDFファイルを使用してください',
          'テキスト形式のPDFファイルに変換してください',
          '画像品質を改善してください',
          '手動で問題を入力することをお勧めします'
        ]
      })
    }
    
    console.log(`✅ テキスト抽出完了: ${extractedText.length}文字`)
    
    // Step 2: 医療問題として解析
    console.log('🏥 医療問題解析開始...')
    const medicalQuizSet = parseMedicalQuestions(extractedText)
    
    if (medicalQuizSet.questions.length === 0) {
      return NextResponse.json({
        success: false,
        error: '医療問題として解析できませんでした',
        extractedText,
        textLength: extractedText.length,
        analysis: {
          hasNumbers: /\d+/.test(extractedText),
          hasChoices: /[1-5ア-オa-eA-E]\s*[．.\)）]/.test(extractedText),
          hasMedicalTerms: /(?:患者|症例|治療|診断|薬物|投与|症状|疾患)/.test(extractedText),
          hasQuestionMarkers: /(?:問題?|Question|Q)\s*\d+/.test(extractedText)
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
    
    // Step 3: データベースに保存
    const savedQuestions = []
    let targetCategoryId = categoryId
    
    // カテゴリー自動検出
    if (autoDetectCategory && medicalQuizSet.questions.length > 0) {
      const firstQuestionText = medicalQuizSet.questions[0].questionText
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
        name: `医療問題抽出 - ${new Date().toLocaleDateString('ja-JP')}`
      })
      .select()
      .single()
    
    if (questionSetError) {
      console.error('❌ 問題セット作成エラー:', questionSetError)
      throw new Error(`問題セット作成エラー: ${questionSetError.message}`)
    }
    
    console.log(`📚 問題セット作成完了: ID ${questionSet.id}`)
    
    // 各問題を保存
    for (let i = 0; i < medicalQuizSet.questions.length; i++) {
      const question = medicalQuizSet.questions[i]
      
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
        console.log(`✅ 問題${i + 1}保存完了`)
        
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
    
    console.log(`🎉 医療問題OCR処理完了: ${savedQuestions.length}問を保存`)
    
    return NextResponse.json({
      success: true,
      data: {
        totalExtracted: medicalQuizSet.questions.length,
        totalSaved: savedQuestions.length,
        categoryId: targetCategoryId,
        questionSetId: questionSet.id,
        questions: medicalQuizSet.questions.map((q, index) => ({
          number: q.questionNumber || (index + 1),
          text: q.questionText.substring(0, 100) + '...',
          choicesCount: Object.keys(q.choices).length,
          hasCorrectAnswer: !!q.correctAnswer
        }))
      },
      extractedText: extractedText.substring(0, 1000) + '...',
      textLength: extractedText.length,
      message: `${savedQuestions.length}問の医療問題を正常に抽出・保存しました`
    })
    
  } catch (error: any) {
    console.error('❌ 医療問題OCR処理エラー:', error)
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
