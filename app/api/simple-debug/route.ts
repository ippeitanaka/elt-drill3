import { NextRequest, NextResponse } from 'next/server'

// テスト用のシンプルなデバッグAPI
export async function GET() {
  return NextResponse.json({ 
    message: 'シンプルデバッグAPIは動作中です', 
    methods: ['GET', 'POST'],
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('🔍 シンプルデバッグAPI開始')
  
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
    
    // シンプルなファイル情報のみを返す
    return NextResponse.json({
      success: true,
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      },
      message: 'ファイル受信成功',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ シンプルデバッグAPIエラー:', error)
    console.error('❌ エラースタック:', error instanceof Error ? error.stack : 'スタック情報なし')
    
    return NextResponse.json({
      success: false,
      error: 'ファイル処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
