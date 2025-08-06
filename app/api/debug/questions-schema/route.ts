import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    // questionsテーブルの構造を確認
    const { data: sample, error } = await adminClient
      .from('questions')
      .select('*')
      .limit(1)
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }
    
    const columns = sample && sample.length > 0 ? Object.keys(sample[0]) : []
    
    return NextResponse.json({
      success: true,
      tableStructure: {
        availableColumns: columns,
        sampleData: sample?.[0] || null
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
