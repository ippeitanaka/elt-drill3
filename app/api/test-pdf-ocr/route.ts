import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromPDF } from '@/lib/ocr-enhanced'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pdfUrl } = body
    
    if (!pdfUrl) {
      return NextResponse.json(
        { error: 'PDF URL is required' },
        { status: 400 }
      )
    }

    console.log('🧪 PDF処理テスト開始:', pdfUrl)
    
    // PDFファイルをダウンロード
    const response = await fetch(pdfUrl)
    if (!response.ok) {
      throw new Error(`PDFダウンロード失敗: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
    const file = new File([blob], 'test.pdf', { type: 'application/pdf' })
    
    console.log(`📄 PDFファイル情報: サイズ=${file.size}, タイプ=${file.type}`)

    // 新しいPDF処理ライブラリでテキスト抽出
    const extractedText = await extractTextFromPDF(file)
    
    return NextResponse.json({
      success: true,
      textLength: extractedText.length,
      textPreview: extractedText.substring(0, 1000),
      fullText: extractedText.length < 5000 ? extractedText : extractedText.substring(0, 5000) + '...(truncated)'
    })

  } catch (error: any) {
    console.error('❌ PDF処理テストエラー:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      name: error.name
    }, { status: 500 })
  }
}
