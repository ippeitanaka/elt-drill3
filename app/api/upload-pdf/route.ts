import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractTextWithOCR } from '@/lib/ocr-enhanced'

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    const formData = await request.formData()
    
    const questionFile = formData.get('questionFile') as File
    const answerFile = formData.get('answerFile') as File | null
    const categoryId = formData.get('categoryId') as string
    const userId = formData.get('userId') as string

    console.log('🚀 PDFアップロードAPI開始:', {
      questionFile: questionFile?.name,
      answerFile: answerFile?.name,
      categoryId,
      userId: userId || 'empty',
      userIdLength: userId?.length || 0
    })

    if (!questionFile || !categoryId) {
      return NextResponse.json(
        { error: 'Question file and category are required' },
        { status: 400 }
      )
    }

    // ファイル名をサニタイズ
    const sanitizeFileName = (fileName: string): string => {
      return fileName
        .replace(/[^\w\-_.]/g, "_")
        .replace(/_{2,}/g, "_")
        .replace(/^_+|_+$/g, "")
        .substring(0, 100)
    }

    const results: any = { uploads: [] }

    // 問題ファイルをアップロード
    const sanitizedQuestionFileName = sanitizeFileName(questionFile.name)
    const questionFileName = `questions_${Date.now()}_${sanitizedQuestionFileName}`

    console.log('📁 問題ファイルアップロード開始:', questionFileName)

    const { data: questionUploadData, error: questionUploadError } = await adminClient.storage
      .from("pdfs")
      .upload(questionFileName, questionFile)

    if (questionUploadError) {
      console.error("❌ 問題ファイルアップロードエラー:", questionUploadError)
      return NextResponse.json(
        { error: `Question file upload error: ${questionUploadError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ 問題ファイルアップロード完了:', questionUploadData.path)

    // 問題ファイルのpublic URLを生成
    const { data: questionUrlData } = adminClient.storage
      .from('pdfs')
      .getPublicUrl(questionUploadData.path)

    results.uploads.push({
      type: 'question',
      filename: questionFileName,
      path: questionUploadData.path,
      publicUrl: questionUrlData.publicUrl
    })

    // 解答ファイルがある場合はアップロード
    let answerUploadData = null
    if (answerFile) {
      const sanitizedAnswerFileName = sanitizeFileName(answerFile.name)
      const answerFileName = `answers_${Date.now()}_${sanitizedAnswerFileName}`

      console.log('📁 解答ファイルアップロード開始:', answerFileName)

      const { data: answerUpload, error: answerUploadError } = await adminClient.storage
        .from("pdfs")
        .upload(answerFileName, answerFile)

      if (answerUploadError) {
        console.error("❌ 解答ファイルアップロードエラー:", answerUploadError)
        return NextResponse.json(
          { error: `Answer file upload error: ${answerUploadError.message}` },
          { status: 500 }
        )
      }

      answerUploadData = answerUpload
      
      // 解答ファイルのpublic URLを生成
      const { data: answerUrlData } = adminClient.storage
        .from('pdfs')
        .getPublicUrl(answerUpload.path)
      
      results.uploads.push({
        type: 'answer',
        filename: answerFileName,
        path: answerUpload.path,
        publicUrl: answerUrlData.publicUrl
      })

      console.log('✅ 解答ファイルアップロード完了:', answerUpload.path)
    }

    // アップロード記録を保存
    const uploadsToInsert = [
      {
        category_id: categoryId,
        file_name: questionFile.name,
        file_url: questionUploadData.path,
        file_type: "questions",
        file_size: questionFile.size,
        uploaded_by: null,
        is_processed: false,
      },
    ]

    if (answerUploadData && answerFile) {
      uploadsToInsert.push({
        category_id: categoryId,
        file_name: answerFile.name,
        file_url: answerUploadData.path,
        file_type: "answers",
        file_size: answerFile.size,
        uploaded_by: null,
        is_processed: false,
      })
    }

    console.log('💾 データベース記録保存:', uploadsToInsert)

    const { error: recordError } = await adminClient.from("pdf_uploads").insert(uploadsToInsert)

    if (recordError) {
      console.error("❌ データベース記録エラー:", recordError)
      return NextResponse.json(
        { error: `Record save error: ${recordError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ データベース記録保存完了')

    // 【新機能】自動問題抽出を実行
    console.log('🔍 自動問題抽出開始...')
    
    try {
      // PDFファイルのバイナリデータを取得
      const pdfBuffer = await questionFile.arrayBuffer()
      console.log('📄 PDFバイナリデータ取得完了')
      
      // OCR処理で問題抽出
      const extractedQuestions = await extractTextWithOCR(Buffer.from(pdfBuffer), questionFile.name)
      console.log(`📚 問題抽出結果: ${extractedQuestions.length}問`)
      
      if (extractedQuestions.length > 0) {
        // 問題を保存APIに送信
        const saveResponse = await fetch(`${request.url.replace('/upload-pdf', '/save-questions')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            categoryId: categoryId,
            questions: extractedQuestions,
            title: `${questionFile.name} - 自動抽出`,
            description: `${questionFile.name}から自動抽出された問題（${extractedQuestions.length}問）`
          })
        })
        
        if (saveResponse.ok) {
          const saveResult = await saveResponse.json()
          console.log('✅ 問題保存完了:', saveResult)
          
          // 処理済みフラグを更新
          await adminClient
            .from('pdf_uploads')
            .update({ is_processed: true })
            .eq('file_url', questionUploadData.path)
          
          results.autoExtraction = {
            success: true,
            questionsCount: extractedQuestions.length,
            message: `${extractedQuestions.length}問を自動抽出・保存しました`
          }
        } else {
          console.error('❌ 問題保存エラー:', await saveResponse.text())
          results.autoExtraction = {
            success: false,
            error: '問題保存に失敗しました'
          }
        }
      } else {
        console.log('⚠️ 問題が抽出されませんでした')
        results.autoExtraction = {
          success: false,
          questionsCount: 0,
          message: '問題を抽出できませんでした。手動で問題を追加してください。'
        }
      }
    } catch (extractionError: any) {
      console.error('❌ 自動問題抽出エラー:', extractionError)
      results.autoExtraction = {
        success: false,
        error: extractionError.message,
        message: '自動問題抽出に失敗しました。手動で問題を追加してください。'
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: results,
      message: 'Files uploaded successfully'
    })

  } catch (error: any) {
    console.error('❌ PDFアップロードAPI エラー:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
