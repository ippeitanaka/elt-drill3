import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const adminClient = createServerClient()
    
    console.log('🔧 ストレージバケット設定開始...')
    
    // バケットの情報を取得
    const { data: buckets, error: listError } = await adminClient.storage.listBuckets()
    
    if (listError) {
      console.error('❌ バケット一覧取得エラー:', listError)
      return NextResponse.json({
        error: `Bucket list error: ${listError.message}`,
        details: listError
      }, { status: 500 })
    }
    
    console.log('📁 既存バケット:', buckets)
    
    // pdfsバケットが存在するかチェック
    const pdfseBucket = buckets?.find(bucket => bucket.name === 'pdfs')
    
    if (!pdfseBucket) {
      console.log('📁 pdfsバケットが見つかりません。作成中...')
      
      // バケットを作成
      const { data: newBucket, error: createError } = await adminClient.storage
        .createBucket('pdfs', { 
          public: true,
          fileSizeLimit: 50 * 1024 * 1024 // 50MB
        })
      
      if (createError) {
        console.error('❌ バケット作成エラー:', createError)
        return NextResponse.json({
          error: `Bucket creation error: ${createError.message}`,
          details: createError
        }, { status: 500 })
      }
      
      console.log('✅ pdfsバケット作成完了:', newBucket)
    } else {
      console.log('✅ pdfsバケット既存:', pdfseBucket)
      
      // バケットがpublicかどうか確認
      if (!pdfseBucket.public) {
        console.log('🔧 バケットをpublicに更新中...')
        
        const { data: updateResult, error: updateError } = await adminClient.storage
          .updateBucket('pdfs', { 
            public: true,
            fileSizeLimit: 50 * 1024 * 1024
          })
        
        if (updateError) {
          console.error('❌ バケット更新エラー:', updateError)
          return NextResponse.json({
            error: `Bucket update error: ${updateError.message}`,
            details: updateError
          }, { status: 500 })
        }
        
        console.log('✅ バケット更新完了:', updateResult)
      }
    }
    
    // ストレージポリシーのテスト
    console.log('🔍 ストレージアクセステスト中...')
    
    // テストファイルをアップロードしてpublic accessをテスト
    console.log('🧪 テストファイル作成中...')
    
    // 最小のPDFファイル（Base64エンコード済み）
    const testPdfBase64 = 'JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPD4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjE3NAolJUVPRg=='
    const testPdfBuffer = Buffer.from(testPdfBase64, 'base64')
    const testFileName = `test_${Date.now()}.pdf`
    
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('pdfs')
      .upload(testFileName, testPdfBuffer, {
        contentType: 'application/pdf'
      })
    
    if (uploadError) {
      console.error('❌ テストファイルアップロードエラー:', uploadError)
      return NextResponse.json({
        error: `Test upload error: ${uploadError.message}`,
        details: uploadError
      }, { status: 500 })
    }
    
    console.log('✅ テストファイルアップロード完了:', uploadData)
    
    // public URLを取得してテスト
    const { data: urlData } = adminClient.storage
      .from('pdfs')
      .getPublicUrl(uploadData.path)
    
    console.log('🔗 テストファイルURL:', urlData.publicUrl)
    
    // URLアクセステスト
    const urlResponse = await fetch(urlData.publicUrl)
    console.log('📊 URLアクセステスト結果:', {
      status: urlResponse.status,
      statusText: urlResponse.statusText,
      accessible: urlResponse.ok
    })
    
    // テストファイルを削除
    const { error: deleteError } = await adminClient.storage
      .from('pdfs')
      .remove([uploadData.path])
    
    if (deleteError) {
      console.warn('⚠️ テストファイル削除エラー:', deleteError)
    } else {
      console.log('🗑️ テストファイル削除完了')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Storage setup completed successfully',
      buckets,
      testResult: {
        uploadSuccessful: !!uploadData,
        urlAccessible: urlResponse.ok,
        testUrl: urlData.publicUrl
      }
    })
    
  } catch (error: any) {
    console.error('❌ ストレージ設定エラー:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
