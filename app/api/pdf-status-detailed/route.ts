import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    // 詳細なステータスチェック
    const detailed_checks = {
      storage_buckets: [],
      pdf_uploads_table_accessible: false,
      sample_queries: {}
    }
    
    // 1. 全ストレージバケットを確認
    try {
      const { data: buckets, error } = await adminClient.storage.listBuckets()
      detailed_checks.storage_buckets = buckets?.map(b => ({ 
        name: b.name, 
        id: b.id, 
        public: b.public 
      })) || []
    } catch (e: any) {
      detailed_checks.storage_buckets = [`Error: ${e.message}`]
    }
    
    // 2. pdf_uploadsテーブルに直接アクセス
    try {
      const { data, error } = await adminClient.from('pdf_uploads').select('*').limit(1)
      detailed_checks.pdf_uploads_table_accessible = !error
      detailed_checks.sample_queries['pdf_uploads_select'] = {
        success: !error,
        error: error?.message || null,
        data_count: data?.length || 0
      }
    } catch (e: any) {
      detailed_checks.pdf_uploads_table_accessible = false
      detailed_checks.sample_queries['pdf_uploads_select'] = {
        success: false,
        error: e.message
      }
    }
    
    // 3. カテゴリーテーブルも確認
    try {
      const { data, error } = await adminClient.from('categories').select('id, name').limit(3)
      detailed_checks.sample_queries['categories_select'] = {
        success: !error,
        error: error?.message || null,
        sample_data: data || []
      }
    } catch (e: any) {
      detailed_checks.sample_queries['categories_select'] = {
        success: false,
        error: e.message
      }
    }
    
    return NextResponse.json({
      success: true,
      message: '📋 PDFアップロード機能の詳細状況',
      detailed_checks,
      recommendations: [
        'pdfs バケットの存在確認',
        'pdf_uploads テーブルへのアクセス権確認',
        'RLS（Row Level Security）設定の確認'
      ]
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
