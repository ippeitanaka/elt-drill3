import { NextRequest, NextResponse } from 'next/server'

// 最小限のPDFテストAPI
export async function GET() {
  return NextResponse.json({ 
    message: 'テストPDF APIは動作中です', 
    methods: ['GET', 'POST'],
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('🔍 テストPDF API開始')
  
  try {
    console.log('📝 リクエスト解析中...')
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      console.error('❌ ファイルが見つかりません')
      return NextResponse.json({ 
        success: false,
        error: 'PDFファイルが必要です' 
      }, { status: 400 })
    }

    console.log(`📄 ファイル受信: ${file.name} (${file.size} bytes)`)
    
    // 最小限のレスポンス
    return NextResponse.json({
      success: true,
      message: 'テストPDF API正常動作',
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      },
      analysis: {
        basicInfo: {
          textLength: 0,
          lineCount: 0,
          ocrConfidence: 0,
          languages: {
            japanese: false,
            english: false,
            numbers: false
          }
        },
        recommendations: ['テストモード: OCR機能は無効化されています。']
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ テストPDF APIエラー:', error)
    
    return NextResponse.json({
      success: false,
      error: 'テストPDF API処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
