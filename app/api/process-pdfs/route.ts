import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { processQuizPDFs, type ParsedQuizData } from '@/lib/ocr'

interface UploadRecord {
  id: string
  category_id: number
  file_name: string
  file_url: string
  file_type: 'questions' | 'answers'
  file_size: number
  uploaded_by: string | null
  is_processed: boolean
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    
    // 未処理のPDFファイルを取得
    const { data: uploads, error: uploadsError } = await adminClient
      .from('pdf_uploads')
      .select('*')
      .eq('is_processed', false)
      .order('created_at', { ascending: true })
    
    if (uploadsError) {
      throw new Error(`アップロード取得エラー: ${uploadsError.message}`)
    }
    
    if (!uploads || uploads.length === 0) {
      return NextResponse.json({
        success: true,
        message: '処理すべきファイルがありません',
        processed: 0
      })
    }
    
    let processedCount = 0
    let errors: string[] = []
    
    // カテゴリー別にグループ化
    const uploadsByCategory = uploads.reduce((acc, upload: UploadRecord) => {
      if (!acc[upload.category_id]) {
        acc[upload.category_id] = { questions: null, answers: null }
      }
      
      if (upload.file_type === 'questions') {
        acc[upload.category_id].questions = upload
      } else if (upload.file_type === 'answers') {
        acc[upload.category_id].answers = upload
      }
      
      return acc
    }, {} as Record<string, { questions: UploadRecord | null, answers: UploadRecord | null }>)
    
    for (const [categoryId, files] of Object.entries(uploadsByCategory)) {
      try {
        if (!files.questions) {
          console.log(`カテゴリー ${categoryId}: 問題ファイルが見つかりません`)
          continue
        }
        
        console.log(`カテゴリー ${categoryId} の処理を開始...`)
        
        // PDFファイルをダウンロード
        const { data: questionPdfBlob, error: questionDownloadError } = await adminClient.storage
          .from('pdfs')
          .download(files.questions.file_url)
        
        if (questionDownloadError) {
          throw new Error(`問題ファイルのダウンロードエラー: ${questionDownloadError.message}`)
        }
        
        // BlobをFileに変換
        const questionFile = new File([questionPdfBlob], files.questions.file_name, {
          type: 'application/pdf'
        })
        
        let answerFile: File | undefined = undefined
        if (files.answers) {
          const { data: answerPdfBlob, error: answerDownloadError } = await adminClient.storage
            .from('pdfs')
            .download(files.answers.file_url)
          
          if (answerDownloadError) {
            console.warn(`解答ファイルのダウンロードエラー: ${answerDownloadError.message}`)
          } else {
            answerFile = new File([answerPdfBlob], files.answers.file_name, {
              type: 'application/pdf'
            })
          }
        }
        
        // OCR処理実行
        console.log(`OCR処理開始: カテゴリー ${categoryId}`)
        const ocrResult: ParsedQuizData = await processQuizPDFs(questionFile, answerFile)
        
        if (!ocrResult.questions || ocrResult.questions.length === 0) {
          throw new Error('OCR処理失敗: 問題が抽出されませんでした')
        }
        
        console.log(`OCR処理完了: ${ocrResult.questions.length}問抽出`)
        
        // 問題セットを作成
        const questionSetName = `${files.questions.file_name.replace('.pdf', '')} (自動処理)`
        const { data: questionSet, error: setError } = await adminClient
          .from('question_sets')
          .insert([{
            category_id: parseInt(categoryId),
            name: questionSetName
          }])
          .select()
          .single()
        
        if (setError) {
          throw new Error(`問題セット作成エラー: ${setError.message}`)
        }
        
        // 問題をデータベースに保存
        const questionsToInsert = ocrResult.questions.map((q, index) => ({
          question_set_id: questionSet.id,
          question_number: index + 1,
          question_text: q.questionText,
          options: q.choices,
          correct_answers: q.correctAnswer !== undefined ? [q.correctAnswer] : [0]
        }))
        
        const { error: questionsError } = await adminClient
          .from('questions')
          .insert(questionsToInsert)
        
        if (questionsError) {
          throw new Error(`問題保存エラー: ${questionsError.message}`)
        }
        
        // 処理完了をマーク
        const uploadIds = [files.questions.id, files.answers?.id].filter(Boolean)
        const { error: updateError } = await adminClient
          .from('pdf_uploads')
          .update({ 
            is_processed: true,
            extracted_questions: ocrResult.questions.length
          })
          .in('id', uploadIds)
        
        if (updateError) {
          console.error(`処理状態更新エラー: ${updateError.message}`)
        }
        
        processedCount++
        console.log(`カテゴリー ${categoryId} の処理完了: ${ocrResult.questions.length}問`)
        
      } catch (error: any) {
        console.error(`カテゴリー ${categoryId} の処理エラー:`, error)
        errors.push(`カテゴリー ${categoryId}: ${error.message}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `${processedCount}個のカテゴリーを処理しました`,
      processed: processedCount,
      errors: errors.length > 0 ? errors : undefined
    })
    
  } catch (error: any) {
    console.error('OCR処理エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
