import { NextRequest, NextResponse } from 'next/server'

// テスト用GETハンドラー
export async function GET() {
  return NextResponse.json({ 
    message: 'シンプルPDF分析APIは動作中です', 
    methods: ['POST'],
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('🔍 シンプルPDF分析API開始')
  
  try {
    console.log('📝 リクエスト解析中...')
    const formData = await request.formData()
    const file = formData.get('pdf') as File || formData.get('file') as File
    const category = formData.get('category') as string || '心肺停止'
    
    if (!file) {
      console.error('❌ ファイルが見つかりません')
      return NextResponse.json({ 
        success: false,
        error: 'PDFファイルが必要です' 
      }, { status: 400 })
    }

    console.log(`📄 PDF分析開始: ${file.name} (${file.size} bytes), カテゴリー: ${category}`)
    
    // ファイルをBufferに変換
    console.log('📦 ファイル変換中...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log('✅ ファイル読み込み成功')
    
    // OCRなしの基本情報を返す
    const response = {
      success: true,
      message: '基本PDF分析完了',
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        category: category
      },
      analysis: {
        status: 'OCRなしテスト完了',
        timestamp: new Date().toISOString(),
        note: 'OCR機能は意図的に無効化されています（テスト用）'
      },
      recommendation: 'OCR機能を有効にするには /api/debug-pdf-analysis-with-ocr を使用してください'
    }
    
    console.log('📊 分析結果:', response)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ PDF分析エラー:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
