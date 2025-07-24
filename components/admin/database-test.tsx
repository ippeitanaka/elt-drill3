"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DatabaseTest() {
  const [results, setResults] = useState<any>({})
  const [testing, setTesting] = useState(false)

  const runTests = async () => {
    setTesting(true)
    const testResults: any = {}

    try {
      // 1. 基本的なSupabase接続テスト
      console.log('基本接続テスト開始')
      const { data: authData, error: authError } = await supabase.auth.getUser()
      testResults.auth = { 
        success: !authError, 
        user: authData?.user?.email || 'ログインしていません',
        error: authError?.message 
      }

      // 2. categoriesテーブルの読み取りテスト (RLSポリシー無視)
      console.log('カテゴリー読み取りテスト開始')
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .limit(5)
      
      testResults.categoriesRead = {
        success: !categoriesError,
        count: categories?.length || 0,
        data: categories,
        error: categoriesError?.message
      }

      // 3. categoriesテーブルへの書き込みテスト
      console.log('カテゴリー書き込みテスト開始')
      const testCategory = {
        name: 'テストカテゴリー_' + Date.now(),
        description: 'テスト用のカテゴリーです',
        icon: '🧪',
        color: 'bg-green-500'
      }

      const { data: insertData, error: insertError } = await supabase
        .from('categories')
        .insert(testCategory)
        .select()

      testResults.categoriesWrite = {
        success: !insertError,
        data: insertData,
        error: insertError?.message
      }

      // 4. テストカテゴリーの削除
      if (insertData && insertData.length > 0) {
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', insertData[0].id)

        testResults.categoriesDelete = {
          success: !deleteError,
          error: deleteError?.message
        }
      }

    } catch (error) {
      console.error('テスト実行エラー:', error)
      testResults.generalError = error instanceof Error ? error.message : 'Unknown error'
    }

    setResults(testResults)
    setTesting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>データベーステスト</CardTitle>
        <Button onClick={runTests} disabled={testing}>
          {testing ? 'テスト実行中...' : 'テスト実行'}
        </Button>
      </CardHeader>
      <CardContent>
        {Object.keys(results).length > 0 && (
          <div className="space-y-4">
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
