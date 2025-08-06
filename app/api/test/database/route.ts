import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const adminClient = createServerClient()
    
    const testResults = {
      read: { success: false, error: null as string | null },
      write: { success: false, error: null as string | null },
      delete: { success: false, error: null as string | null }
    }
    
    let testCategoryId: number | null = null
    
    // 1. READ テスト
    try {
      console.log('READ テスト開始')
      const { data: readData, error: readError } = await adminClient
        .from('categories')
        .select('*')
        .limit(5)
      
      testResults.read = {
        success: !readError,
        error: readError?.message || null
      }
      
      console.log('READ テスト結果:', testResults.read)
    } catch (error: any) {
      testResults.read = {
        success: false,
        error: error.message
      }
    }
    
    // 2. WRITE テスト
    try {
      console.log('WRITE テスト開始')
      const testCategory = {
        name: 'DBテスト_' + Date.now()
      }
      
      const { data: writeData, error: writeError } = await adminClient
        .from('categories')
        .insert([testCategory])
        .select()
      
      const writeSuccess = !writeError && writeData && writeData.length > 0
      
      if (writeSuccess) {
        testCategoryId = writeData[0].id
      }
      
      testResults.write = {
        success: writeSuccess,
        error: writeError?.message || null
      }
      
      console.log('WRITE テスト結果:', testResults.write, 'ID:', testCategoryId)
    } catch (error: any) {
      testResults.write = {
        success: false,
        error: error.message
      }
    }
    
    // 3. DELETE テスト (作成に成功した場合のみ)
    if (testCategoryId) {
      try {
        console.log('DELETE テスト開始, ID:', testCategoryId)
        const { error: deleteError } = await adminClient
          .from('categories')
          .delete()
          .eq('id', testCategoryId)
        
        testResults.delete = {
          success: !deleteError,
          error: deleteError?.message || null
        }
        
        console.log('DELETE テスト結果:', testResults.delete)
      } catch (error: any) {
        testResults.delete = {
          success: false,
          error: error.message
        }
      }
    } else {
      testResults.delete = {
        success: false,
        error: '作成テストが失敗したため、削除テストをスキップしました'
      }
    }
    
    const allSuccess = testResults.read.success && testResults.write.success && testResults.delete.success
    
    return NextResponse.json({
      success: true,
      message: allSuccess ? '✅ すべてのデータベース操作が成功しました' : '⚠️ 一部のデータベース操作が失敗しました',
      testResults,
      summary: {
        read: testResults.read.success ? '成功' : '失敗',
        write: testResults.write.success ? '成功' : '失敗',
        delete: testResults.delete.success ? '成功' : '失敗'
      }
    })
    
  } catch (error: any) {
    console.error('データベーステストエラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: '❌ データベーステストに失敗しました'
    }, { status: 500 })
  }
}
