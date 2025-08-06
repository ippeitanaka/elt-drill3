import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    
    console.log('=== PDF OCR処理テスト開始 ===')
    
    // 未処理のPDFファイルを取得
    const { data: uploads, error: uploadsError } = await adminClient
      .from('pdf_uploads')
      .select('*')
      .eq('is_processed', false)
      .limit(1)
    
    if (uploadsError) {
      throw new Error(`アップロード取得エラー: ${uploadsError.message}`)
    }
    
    if (!uploads || uploads.length === 0) {
      return NextResponse.json({
        success: false,
        message: '処理すべきファイルがありません'
      })
    }
    
    const upload = uploads[0]
    console.log('処理対象ファイル:', upload.file_name)
    
    // PDFファイルをダウンロード
    const { data: pdfBlob, error: downloadError } = await adminClient.storage
      .from('pdfs')
      .download(upload.file_url)
    
    if (downloadError) {
      throw new Error(`ファイルダウンロードエラー: ${downloadError.message}`)
    }
    
    console.log('PDFファイルダウンロード成功:', {
      size: pdfBlob.size,
      type: pdfBlob.type
    })
    
    // PDF基本情報を確認
    return NextResponse.json({
      success: true,
      data: {
        filename: upload.file_name,
        fileSize: upload.file_size,
        downloadedSize: pdfBlob.size,
        fileType: pdfBlob.type,
        category: upload.category_id
      },
      message: 'PDF情報取得成功'
    })
    
  } catch (error: any) {
    console.error('PDF情報取得エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
