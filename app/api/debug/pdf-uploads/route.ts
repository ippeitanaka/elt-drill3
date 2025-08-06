import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    // 未処理のPDFアップロードを確認
    const { data: uploads, error } = await adminClient
      .from('pdf_uploads')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        totalUploads: uploads?.length || 0,
        unprocessedCount: uploads?.filter(u => !u.is_processed).length || 0,
        uploads: uploads || []
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
