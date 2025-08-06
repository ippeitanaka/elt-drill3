import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const adminClient = createServerClient()
    
    // テスト用のダミーファイルでアップロードをテスト
    console.log('🧪 PDFアップロード機能のテストを開始します...')
    
    const results: any[] = []
    
    // 1. ストレージへの書き込みテスト
    try {
      const testData = new Blob(['Test PDF content for upload test'], { type: 'application/pdf' })
      const testFileName = `test_upload_${Date.now()}.pdf`
      
      const { data: uploadData, error: uploadError } = await adminClient.storage
        .from('pdfs')
        .upload(testFileName, testData)
      
      if (uploadError) {
        results.push({
          test: 'storage_upload',
          status: 'failed',
          error: uploadError.message
        })
      } else {
        results.push({
          test: 'storage_upload', 
          status: 'success',
          file_path: uploadData.path
        })
        
        // テストファイルを削除
        await adminClient.storage.from('pdfs').remove([testFileName])
      }
    } catch (e: any) {
      results.push({
        test: 'storage_upload',
        status: 'failed', 
        error: e.message
      })
    }
    
    // 2. pdf_uploadsテーブルへの書き込みテスト
    try {
      const testRecord = {
        category_id: 19, // 心肺蘇生法
        file_name: 'test_upload.pdf',
        file_url: 'test/path/test_upload.pdf',
        file_type: 'questions',
        file_size: 1024,
        is_processed: false
      }
      
      const { data: insertData, error: insertError } = await adminClient
        .from('pdf_uploads')
        .insert([testRecord])
        .select()
      
      if (insertError) {
        results.push({
          test: 'database_insert',
          status: 'failed',
          error: insertError.message
        })
      } else {
        results.push({
          test: 'database_insert',
          status: 'success',
          inserted_id: insertData?.[0]?.id
        })
        
        // テストレコードを削除
        if (insertData?.[0]?.id) {
          await adminClient.from('pdf_uploads').delete().eq('id', insertData[0].id)
        }
      }
    } catch (e: any) {
      results.push({
        test: 'database_insert',
        status: 'failed',
        error: e.message
      })
    }
    
    // 3. 利用可能なカテゴリー確認
    try {
      const { data: categories, error: categoriesError } = await adminClient
        .from('categories')
        .select('id, name')
        .limit(5)
      
      results.push({
        test: 'categories_available',
        status: categoriesError ? 'failed' : 'success',
        error: categoriesError?.message || null,
        available_categories: categories || []
      })
    } catch (e: any) {
      results.push({
        test: 'categories_available',
        status: 'failed',
        error: e.message
      })
    }
    
    const successCount = results.filter(r => r.status === 'success').length
    const readyForUse = successCount >= 2 // ストレージとデータベースが動作すれば十分
    
    return NextResponse.json({
      success: readyForUse,
      message: readyForUse ? 
        '🎉 PDFアップロード機能は使用可能です！' : 
        '⚠️ PDFアップロード機能にまだ問題があります',
      test_results: results,
      summary: {
        total_tests: results.length,
        passed_tests: successCount,
        ready_for_use: readyForUse
      },
      next_steps: readyForUse ? [
        '管理画面でPDFアップロードを試してください',
        'カテゴリーを選択してPDFファイルをアップロード',
        'OCR機能で問題文を自動抽出'
      ] : [
        'ストレージ権限の確認',
        'データベースアクセス権の確認',  
        'Supabase設定の見直し'
      ]
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      message: '❌ PDFアップロード機能のテストに失敗しました'
    }, { status: 500 })
  }
}
