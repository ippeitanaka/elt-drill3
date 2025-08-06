import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    // PDFファイルの確認
    const { data: pdfFiles, error: pdfError } = await adminClient
      .storage
      .from('pdfs')
      .list()
    
    // 問題セットテーブルの確認
    const { data: questionSets, error: setsError } = await adminClient
      .from('question_sets')
      .select('*')
      .limit(10)
    
    // 問題テーブルの確認
    const { data: questions, error: questionsError } = await adminClient
      .from('questions')
      .select('*')
      .limit(10)
    
    return NextResponse.json({
      success: true,
      data: {
        pdfFiles: {
          count: pdfFiles?.length || 0,
          files: pdfFiles || [],
          error: pdfError?.message
        },
        questionSets: {
          count: questionSets?.length || 0,
          data: questionSets || [],
          error: setsError?.message
        },
        questions: {
          count: questions?.length || 0,
          data: questions || [],
          error: questionsError?.message
        }
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
