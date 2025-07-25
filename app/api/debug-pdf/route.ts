import { NextRequest, NextResponse } from 'next/server'
import { debugPDFText } from '@/lib/ocr'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log("PDF Debug API - ファイル情報:", {
      name: file.name,
      size: file.size,
      type: file.type
    })

    const debugText = await debugPDFText(file)
    
    return NextResponse.json({
      success: true,
      data: {
        filename: file.name,
        size: file.size,
        extractedText: debugText
      }
    })

  } catch (error: any) {
    console.error('PDF Debug API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
