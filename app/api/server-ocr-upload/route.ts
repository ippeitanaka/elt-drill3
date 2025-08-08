import { NextRequest, NextResponse } from 'next/server'
import { serverOCR } from '@/lib/server-ocr'
import { parseMedicalQuestions } from '@/lib/medical-question-parser'
import { createServerClient } from '@/lib/supabase'

// テスト用GETハンドラー
export async function GET() {
  return NextResponse.json({ 
    message: 'サーバーOCR APIは動作中です', 
    methods: ['POST'],
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('🚀 サーバーサイドOCR処理開始')
  
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File || formData.get('file') as File
    const categoryName = formData.get('category') as string || '心肺停止'
    
    if (!file) {
      return NextResponse.json({ 
        success: false,
        error: 'PDFファイルが必要です' 
      }, { status: 400 })
    }

    console.log(`📄 PDF処理開始: ${file.name} (${file.size} bytes)`)
    
    // ファイルをBufferに変換
    const arrayBuffer = await file.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)
    
    // サーバーサイドOCR処理
    console.log('🔍 サーバーサイドOCR実行...')
    let ocrResult
    let textQuality
    
    try {
      ocrResult = await serverOCR.extractTextFromPDF(pdfBuffer, {
        language: 'jpn+eng',
        dpi: 300,
        preprocessImage: true
      })

      console.log(`📝 OCR完了: ${ocrResult.text.length}文字、信頼度: ${ocrResult.confidence}`)
      
      // テキスト品質評価
      textQuality = serverOCR.evaluateTextQuality(ocrResult.text)
      console.log(`📊 テキスト品質スコア: ${textQuality.score}`)
      
    } catch (ocrError) {
      console.error('❌ OCR処理エラー:', ocrError)
      return NextResponse.json({
        success: false,
        error: 'OCR処理に失敗しました',
        details: ocrError instanceof Error ? ocrError.message : String(ocrError),
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      }, { status: 500 })
    }

    // 問題解析
    const questions = parseMedicalQuestions(ocrResult.text)
    console.log(`🎯 解析結果: ${questions.questions.length}問検出`)

    if (questions.questions.length === 0) {
      return NextResponse.json({
        success: false,
        error: '問題が検出されませんでした',
        analysis: {
          textLength: ocrResult.text.length,
          confidence: ocrResult.confidence,
          textQuality,
          textSample: ocrResult.text.substring(0, 500),
          recommendations: [
            'PDFの画質を確認してください',
            '問題形式（問1、Q1、1.など）が含まれているか確認してください',
            '選択肢形式（1.、a.、ア.など）が含まれているか確認してください'
          ]
        }
      }, { status: 400 })
    }

    // カテゴリー確認・作成
    console.log(`📁 カテゴリー処理: ${categoryName}`)
    const supabase = createServerClient()
    
    let { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('name', categoryName)
      .single()

    let categoryId: number

    if (categoryError || !categories) {
      console.log('📁 新しいカテゴリーを作成...')
      const { data: newCategory, error: createError } = await supabase
        .from('categories')
        .insert([{ name: categoryName }])
        .select('id, name')
        .single()

      if (createError || !newCategory) {
        throw new Error(`カテゴリー作成エラー: ${createError?.message}`)
      }
      categoryId = newCategory.id as number
    } else {
      categoryId = categories.id as number
    }

    console.log(`📁 カテゴリーID: ${categoryId}`)

    // 問題セット作成
    const questionSetName = `${file.name.replace('.pdf', '')} - サーバーOCR抽出`
    console.log(`📚 問題セット作成: ${questionSetName}`)
    
    const { data: questionSet, error: questionSetError } = await supabase
      .from('question_sets')
      .insert([{
        category_id: categoryId,
        name: questionSetName
      }])
      .select()
      .single()

    if (questionSetError || !questionSet) {
      throw new Error(`問題セット作成エラー: ${questionSetError?.message}`)
    }

    console.log(`📚 問題セットID: ${questionSet.id}`)

    // 問題データの準備と保存
    const questionsToInsert = questions.questions.map((q, index) => ({
      question_set_id: questionSet.id,
      question_number: index + 1,
      question_text: q.questionText,
      options: JSON.stringify({
        a: q.choices[0] || '',
        b: q.choices[1] || '',
        c: q.choices[2] || '',
        d: q.choices[3] || '',
        e: q.choices[4] || ''
      }),
      correct_answers: JSON.stringify([q.correctAnswer || 'a'])
    }))

    console.log(`💾 ${questionsToInsert.length}問をデータベースに保存...`)
    const { data: savedQuestions, error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select()

    if (questionsError) {
      throw new Error(`問題保存エラー: ${questionsError.message}`)
    }

    console.log(`✅ 処理完了: ${savedQuestions?.length}問保存`)

    // PDFファイルをSupabaseストレージに保存
    const timestamp = Date.now()
    const fileName = `server_ocr_${timestamp}_${file.name}`
    
    console.log(`📁 PDFファイル保存: ${fileName}`)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdfs')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      })

    if (uploadError) {
      console.warn(`⚠️ ファイル保存警告: ${uploadError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: `サーバーサイドOCRで${savedQuestions?.length}問を正常に抽出・保存しました`,
      results: {
        questionsCount: savedQuestions?.length || 0,
        categoryId: categoryId,
        categoryName: categoryName,
        questionSetId: questionSet.id,
        questionSetName: questionSetName,
        ocrConfidence: ocrResult.confidence,
        textQuality: textQuality,
        fileName: uploadData?.path || fileName
      },
      analysis: {
        textLength: ocrResult.text.length,
        pagesProcessed: ocrResult.pageResults.length,
        confidence: ocrResult.confidence,
        sampleQuestions: questions.questions.slice(0, 3).map(q => ({
          text: q.questionText?.substring(0, 100),
          choicesCount: q.choices.length
        }))
      }
    })

  } catch (error) {
    console.error('❌ サーバーサイドOCRエラー:', error)
    
    return NextResponse.json({
      success: false,
      error: 'サーバーサイドOCR処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
