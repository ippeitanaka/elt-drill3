import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📋 シンプルPDF処理リクエスト受信:', body)
    
    return NextResponse.json({
      success: true,
      message: 'シンプルPDF処理エンドポイントが動作しています',
      received: body
    })
  } catch (error: any) {
    console.error('❌ シンプルPDF処理エラー:', error)
    return NextResponse.json(
      { error: 'シンプルPDF処理エラーが発生しました', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'シンプルPDF処理エンドポイントが正常に動作しています',
    timestamp: new Date().toISOString()
  })
}
