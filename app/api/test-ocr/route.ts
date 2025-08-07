import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromPDF } from '@/lib/ocr-enhanced'

export async function POST(request: NextRequest) {
  console.log('=== OCRテストAPI呼び出し ===')
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      )
    }
    
    console.log(`📁 ファイル受信: ${file.name} (${file.size} bytes)`)
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'PDFファイルを選択してください' },
        { status: 400 }
      )
    }
    
    // OCR処理開始時刻を記録
    const startTime = Date.now()
    console.log('⏱️ OCR処理開始時刻:', new Date().toISOString())
    
    // PDFからテキストを抽出（OCR含む）
    const extractedText = await extractTextFromPDF(file)
    
    const endTime = Date.now()
    const processingTime = endTime - startTime
    
    console.log('⏱️ OCR処理完了時刻:', new Date().toISOString())
    console.log(`⏱️ 処理時間: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}秒)`)
    
    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      textLength: extractedText.length,
      processingTimeMs: processingTime,
      processingTimeSec: Math.round(processingTime / 1000),
      textPreview: extractedText.substring(0, 2000) + (extractedText.length > 2000 ? '...' : ''),
      extractedAt: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ OCRテストAPIエラー:', error)
    
    return NextResponse.json(
      { 
        error: 'OCR処理に失敗しました',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'OCRテストAPI',
    usage: 'POST /api/test-ocr with file parameter',
    description: 'PDFファイルのOCR処理をテストします。Tesseract.jsを使用した画像ベースPDFの文字認識が含まれます。',
    timestamp: new Date().toISOString()
  })
}
