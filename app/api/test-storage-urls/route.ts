import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    // ストレージ内のファイルをリスト
    const { data: files, error: listError } = await adminClient.storage
      .from('pdfs')
      .list('', {
        limit: 10,
        offset: 0
      })
    
    if (listError) {
      return NextResponse.json({
        error: `File list error: ${listError.message}`,
        details: listError
      }, { status: 500 })
    }
    
    console.log('📁 ストレージファイル一覧:', files)
    
    // 各ファイルのpublic URLを生成してテスト
    const urlTests = []
    
    for (const file of files || []) {
      const { data: urlData } = adminClient.storage
        .from('pdfs')
        .getPublicUrl(file.name)
      
      console.log(`🔗 ファイル "${file.name}" のURL:`, urlData.publicUrl)
      
      // URLにアクセステスト
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' })
        urlTests.push({
          filename: file.name,
          url: urlData.publicUrl,
          accessible: response.ok,
          status: response.status,
          statusText: response.statusText
        })
      } catch (fetchError: any) {
        urlTests.push({
          filename: file.name,
          url: urlData.publicUrl,
          accessible: false,
          error: fetchError.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      files,
      urlTests
    })
    
  } catch (error: any) {
    console.error('❌ ストレージテストエラー:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
