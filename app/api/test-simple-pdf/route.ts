import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pdfUrl } = body
    
    if (!pdfUrl) {
      return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 })
    }
    
    console.log('🔍 シンプルPDFテスト開始:', pdfUrl)
    
    // PDFをダウンロード
    const response = await fetch(pdfUrl)
    if (!response.ok) {
      throw new Error(`PDF download failed: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log(`📊 PDFサイズ: ${buffer.length} bytes`)
    
    // PDFヘッダーチェック
    const header = buffer.slice(0, 10).toString()
    console.log('📄 PDFヘッダー:', header)
    
    // 基本的な情報を返す
    return NextResponse.json({
      success: true,
      fileSize: buffer.length,
      header: header,
      isPDF: header.startsWith('%PDF'),
      message: 'PDF基本情報取得成功'
    })
    
  } catch (error: any) {
    console.error('❌ シンプルPDFテストエラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
