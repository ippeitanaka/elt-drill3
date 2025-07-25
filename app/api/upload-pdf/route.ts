import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    const formData = await request.formData()
    
    const questionFile = formData.get('questionFile') as File
    const answerFile = formData.get('answerFile') as File | null
    const categoryId = formData.get('categoryId') as string
    const userId = formData.get('userId') as string

    console.log('API received data:', {
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

    const { data: questionUploadData, error: questionUploadError } = await adminClient.storage
      .from("pdfs")
      .upload(questionFileName, questionFile)

    if (questionUploadError) {
      console.error("Question upload error:", questionUploadError)
      return NextResponse.json(
        { error: `Question file upload error: ${questionUploadError.message}` },
        { status: 500 }
      )
    }

    results.uploads.push({
      type: 'question',
      filename: questionFileName,
      path: questionUploadData.path
    })

    // 解答ファイルがある場合はアップロード
    let answerUploadData = null
    if (answerFile) {
      const sanitizedAnswerFileName = sanitizeFileName(answerFile.name)
      const answerFileName = `answers_${Date.now()}_${sanitizedAnswerFileName}`

      const { data: answerUpload, error: answerUploadError } = await adminClient.storage
        .from("pdfs")
        .upload(answerFileName, answerFile)

      if (answerUploadError) {
        console.error("Answer upload error:", answerUploadError)
        return NextResponse.json(
          { error: `Answer file upload error: ${answerUploadError.message}` },
          { status: 500 }
        )
      }

      answerUploadData = answerUpload
      results.uploads.push({
        type: 'answer',
        filename: answerFileName,
        path: answerUpload.path
      })
    }

    // アップロード記録を保存
    const uploadsToInsert = [
      {
        category_id: categoryId,
        file_name: questionFile.name,
        file_url: questionUploadData.path,
        file_type: "questions",
        file_size: questionFile.size,
        uploaded_by: userId && userId !== 'anonymous' ? userId : null,
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
        uploaded_by: userId && userId !== 'anonymous' ? userId : null,
        is_processed: false,
      })
    }

    console.log('Data to insert into database:', uploadsToInsert)

    const { error: recordError } = await adminClient.from("pdf_uploads").insert(uploadsToInsert)

    if (recordError) {
      console.error("Record error:", recordError)
      return NextResponse.json(
        { error: `Record save error: ${recordError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      data: results,
      message: 'Files uploaded successfully'
    })

  } catch (error: any) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
