"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, CheckCircle, XCircle, Loader } from "lucide-react"

export function DatabaseSchemaCheck() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const checkDatabase = async () => {
    setLoading(true)
    try {
      // 各テーブルのサンプルデータを直接取得
      const [categoriesResult, questionsResult, setsResult, profilesResult, sessionsResult] = await Promise.allSettled([
        supabase.from('categories').select('*').limit(3),
        supabase.from('questions').select('*').limit(3),
        supabase.from('question_sets').select('*').limit(3),
        supabase.from('profiles').select('*').limit(3),
        supabase.from('quiz_sessions').select('*').limit(3)
      ])

      // ストレージバケットの確認
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

      setResults({
        samples: {
          categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value : { error: categoriesResult.reason },
          questions: questionsResult.status === 'fulfilled' ? questionsResult.value : { error: questionsResult.reason },
          question_sets: setsResult.status === 'fulfilled' ? setsResult.value : { error: setsResult.reason },
          profiles: profilesResult.status === 'fulfilled' ? profilesResult.value : { error: profilesResult.reason },
          quiz_sessions: sessionsResult.status === 'fulfilled' ? sessionsResult.value : { error: sessionsResult.reason }
        },
        buckets: buckets || [],
        bucketsError
      })
    } catch (error) {
      console.error('Database check error:', error)
      setResults({ error: error })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            データベース構造チェック
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={checkDatabase} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                チェック中...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                データベースをチェック
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-4">
          {results.error ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  エラー
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-red-50 p-4 rounded overflow-auto">
                  {JSON.stringify(results.error, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* テーブル確認結果 */}
              <Card>
                <CardHeader>
                  <CardTitle>テーブル接続状況</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(results.samples).map(([tableName, result]: [string, any]) => (
                      <div key={tableName} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium">{tableName}</span>
                        {result.error ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            エラー
                          </Badge>
                        ) : (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            OK ({result.data?.length || 0}件)
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* サンプルデータ */}
              {Object.entries(results.samples).map(([tableName, result]: [string, any]) => (
                !result.error && result.data && result.data.length > 0 && (
                  <Card key={tableName}>
                    <CardHeader>
                      <CardTitle>{tableName} サンプルデータ</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )
              ))}

              {/* ストレージバケット */}
              <Card>
                <CardHeader>
                  <CardTitle>ストレージバケット</CardTitle>
                </CardHeader>
                <CardContent>
                  {results.bucketsError ? (
                    <p className="text-red-600">バケット取得エラー: {results.bucketsError.message}</p>
                  ) : (
                    <div className="space-y-2">
                      {results.buckets.map((bucket: any) => (
                        <div key={bucket.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="font-medium">{bucket.name}</span>
                          <Badge variant="outline">
                            {bucket.public ? 'パブリック' : 'プライベート'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}
