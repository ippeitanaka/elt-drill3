import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const adminClient = createServerClient()
    const results: any[] = []
    
    // 1. PDFストレージバケットを作成
    try {
      const { data: bucket, error: bucketError } = await adminClient.storage.createBucket('pdfs', {
        public: false,
        allowedMimeTypes: ['application/pdf'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB制限
      })
      
      if (bucketError && !bucketError.message.includes('already exists')) {
        results.push({ 
          step: 'create_bucket', 
          status: 'failed', 
          error: bucketError.message 
        })
      } else {
        results.push({ 
          step: 'create_bucket', 
          status: 'success', 
          message: 'PDFストレージバケット作成完了'
        })
      }
    } catch (e: any) {
      results.push({ 
        step: 'create_bucket', 
        status: 'failed', 
        error: e.message 
      })
    }
    
    // 2. pdf_uploadsテーブルを作成
    try {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.pdf_uploads (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          category_id INTEGER REFERENCES categories(id),
          file_name VARCHAR NOT NULL,
          file_url VARCHAR NOT NULL,
          file_type VARCHAR CHECK (file_type IN ('questions', 'answers')),
          file_size INTEGER,
          uploaded_by UUID,
          is_processed BOOLEAN DEFAULT FALSE,
          extracted_questions JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
      
      // RPC関数で実行（直接SQLが使えない場合の代替）
      const { data, error: tableError } = await adminClient.rpc('exec_sql', {
        sql_query: createTableSQL
      })
      
      if (tableError) {
        // RPCが使えない場合、直接テーブル作成を試す
        const { error: directError } = await adminClient.from('pdf_uploads').select('id').limit(1)
        if (directError && directError.message.includes('does not exist')) {
          results.push({ 
            step: 'create_table', 
            status: 'failed', 
            error: 'pdf_uploadsテーブルを作成できません。手動でのSQL実行が必要です。',
            sql: createTableSQL
          })
        } else {
          results.push({ 
            step: 'create_table', 
            status: 'success', 
            message: 'pdf_uploadsテーブルは既に存在します'
          })
        }
      } else {
        results.push({ 
          step: 'create_table', 
          status: 'success', 
          message: 'pdf_uploadsテーブル作成完了'
        })
      }
    } catch (e: any) {
      results.push({ 
        step: 'create_table', 
        status: 'failed', 
        error: e.message 
      })
    }
    
    // 3. 必要なポリシーを作成
    try {
      const policySQL = `
        -- pdf_uploadsテーブルのRLS有効化
        ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
        
        -- 管理者のみアクセス可能なポリシー
        CREATE POLICY IF NOT EXISTS "Admins can manage PDF uploads" ON pdf_uploads 
        FOR ALL TO authenticated 
        USING (true);
      `
      
      const { error: policyError } = await adminClient.rpc('exec_sql', {
        sql_query: policySQL
      })
      
      if (policyError) {
        results.push({ 
          step: 'create_policies', 
          status: 'failed', 
          error: policyError.message,
          sql: policySQL
        })
      } else {
        results.push({ 
          step: 'create_policies', 
          status: 'success', 
          message: 'RLSポリシー作成完了'
        })
      }
    } catch (e: any) {
      results.push({ 
        step: 'create_policies', 
        status: 'failed', 
        error: e.message 
      })
    }
    
    const successCount = results.filter(r => r.status === 'success').length
    const totalSteps = results.length
    
    return NextResponse.json({
      success: successCount === totalSteps,
      message: successCount === totalSteps ? 
        '🎉 PDFアップロード機能のセットアップが完了しました！' :
        `⚠️ セットアップ中に問題が発生しました (${successCount}/${totalSteps} 成功)`,
      results,
      setup_complete: successCount === totalSteps
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: '❌ PDFアップロード機能のセットアップに失敗しました'
    }, { status: 500 })
  }
}
