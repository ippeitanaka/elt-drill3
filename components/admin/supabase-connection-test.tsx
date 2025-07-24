"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Database, Wifi, WifiOff } from "lucide-react"

interface ConnectionStatus {
  isConnected: boolean
  latency: number | null
  error: string | null
  databaseStatus: 'connected' | 'error' | 'checking'
  authUser: any
  crudTest: {
    read: boolean | null
    write: boolean | null
    delete: boolean | null
    readError: string | null
    writeError: string | null
    deleteError: string | null
  }
}

export function SupabaseConnectionTest() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    latency: null,
    error: null,
    databaseStatus: 'checking',
    authUser: null,
    crudTest: {
      read: null,
      write: null,
      delete: null,
      readError: null,
      writeError: null,
      deleteError: null
    }
  })
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setIsChecking(true)
    const startTime = Date.now()
    
    try {
      // 1. 認証状況を確認
      const { data: authData, error: authError } = await supabase.auth.getUser()
      
      // 2. 簡単なクエリでSupabase接続をテスト
      const { data, error } = await supabase
        .from('categories')
        .select('count')
        .limit(1)

      const latency = Date.now() - startTime

      if (error) {
        setStatus(prev => ({
          ...prev,
          isConnected: false,
          latency,
          error: error.message,
          databaseStatus: 'error',
          authUser: authData?.user || null
        }))
      } else {
        setStatus(prev => ({
          ...prev,
          isConnected: true,
          latency,
          error: null,
          databaseStatus: 'connected',
          authUser: authData?.user || null
        }))
      }
    } catch (err) {
      const latency = Date.now() - startTime
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        latency,
        error: err instanceof Error ? err.message : '接続エラーが発生しました',
        databaseStatus: 'error',
        authUser: null
      }))
    } finally {
      setIsChecking(false)
    }
  }

  const runCrudTest = async () => {
    console.log('CRUD テスト開始')
    
    // リセット
    setStatus(prev => ({
      ...prev,
      crudTest: {
        read: null,
        write: null,
        delete: null,
        readError: null,
        writeError: null,
        deleteError: null
      }
    }))

    let testCategoryId: string | null = null

    try {
      // 1. READ テスト
      console.log('READ テスト開始')
      const { data: readData, error: readError } = await supabase
        .from('categories')
        .select('*')
        .limit(5)

      setStatus(prev => ({
        ...prev,
        crudTest: {
          ...prev.crudTest,
          read: !readError,
          readError: readError?.message || null
        }
      }))

      console.log('READ テスト結果:', { success: !readError, data: readData, error: readError })

      // 2. WRITE テスト
      console.log('WRITE テスト開始')
      const testCategory = {
        name: 'テストカテゴリー_' + Date.now(),
        description: 'CRUD テスト用のカテゴリーです',
        icon: '🧪',
        color: 'bg-orange-500'
      }

      const { data: writeData, error: writeError } = await supabase
        .from('categories')
        .insert(testCategory)
        .select()

      const writeSuccess = !writeError && writeData && writeData.length > 0
      if (writeSuccess) {
        testCategoryId = writeData[0].id
      }

      setStatus(prev => ({
        ...prev,
        crudTest: {
          ...prev.crudTest,
          write: writeSuccess,
          writeError: writeError?.message || null
        }
      }))

      console.log('WRITE テスト結果:', { success: writeSuccess, data: writeData, error: writeError })

      // 3. DELETE テスト (作成に成功した場合のみ)
      if (testCategoryId) {
        console.log('DELETE テスト開始')
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', testCategoryId)

        setStatus(prev => ({
          ...prev,
          crudTest: {
            ...prev.crudTest,
            delete: !deleteError,
            deleteError: deleteError?.message || null
          }
        }))

        console.log('DELETE テスト結果:', { success: !deleteError, error: deleteError })
      } else {
        setStatus(prev => ({
          ...prev,
          crudTest: {
            ...prev.crudTest,
            delete: false,
            deleteError: '作成テストが失敗したため、削除テストをスキップしました'
          }
        }))
      }

    } catch (error) {
      console.error('CRUD テストエラー:', error)
      const errorMessage = error instanceof Error ? error.message : '不明なエラー'
      
      setStatus(prev => ({
        ...prev,
        crudTest: {
          read: prev.crudTest.read,
          write: prev.crudTest.write || false,
          delete: false,
          readError: prev.crudTest.readError,
          writeError: prev.crudTest.writeError || errorMessage,
          deleteError: errorMessage
        }
      }))
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Supabase接続状況 & テスト
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">接続状態</span>
          <div className="flex items-center gap-2">
            {status.isConnected ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-600" />
            )}
            <Badge 
              variant={status.isConnected ? "default" : "destructive"}
              className="text-xs"
            >
              {status.isConnected ? "接続済み" : "切断"}
            </Badge>
          </div>
        </div>

        {status.latency && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">レスポンス時間</span>
            <span className="text-sm font-medium">{status.latency}ms</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">データベース</span>
          <div className="flex items-center gap-2">
            {status.databaseStatus === 'connected' && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
            {status.databaseStatus === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <Badge 
              variant={
                status.databaseStatus === 'connected' ? "default" : 
                status.databaseStatus === 'error' ? "destructive" : 
                "secondary"
              }
              className="text-xs"
            >
              {status.databaseStatus === 'connected' ? "正常" : 
               status.databaseStatus === 'error' ? "エラー" : "確認中"}
            </Badge>
          </div>
        </div>

        {status.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{status.error}</p>
          </div>
        )}

        {/* 認証情報 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">認証状況</span>
          </div>
          <div className="text-xs text-gray-600">
            {status.authUser ? (
              <div>
                <p>ユーザー: {status.authUser.email}</p>
                <p>ID: {status.authUser.id}</p>
              </div>
            ) : (
              <p>未認証</p>
            )}
          </div>
        </div>

        {/* CRUDテスト */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">データベース操作テスト</span>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span>読み取り (READ)</span>
              {status.crudTest.read === null ? (
                <Badge variant="secondary">未実行</Badge>
              ) : status.crudTest.read ? (
                <Badge variant="default" className="bg-green-600">成功</Badge>
              ) : (
                <Badge variant="destructive">失敗</Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span>書き込み (WRITE)</span>
              {status.crudTest.write === null ? (
                <Badge variant="secondary">未実行</Badge>
              ) : status.crudTest.write ? (
                <Badge variant="default" className="bg-green-600">成功</Badge>
              ) : (
                <Badge variant="destructive">失敗</Badge>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <span>削除 (DELETE)</span>
              {status.crudTest.delete === null ? (
                <Badge variant="secondary">未実行</Badge>
              ) : status.crudTest.delete ? (
                <Badge variant="default" className="bg-green-600">成功</Badge>
              ) : (
                <Badge variant="destructive">失敗</Badge>
              )}
            </div>
          </div>

          {/* エラー詳細 */}
          {(status.crudTest.readError || status.crudTest.writeError || status.crudTest.deleteError) && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
              {status.crudTest.readError && (
                <p><strong>読み取りエラー:</strong> {status.crudTest.readError}</p>
              )}
              {status.crudTest.writeError && (
                <p><strong>書き込みエラー:</strong> {status.crudTest.writeError}</p>
              )}
              {status.crudTest.deleteError && (
                <p><strong>削除エラー:</strong> {status.crudTest.deleteError}</p>
              )}
            </div>
          )}

          <Button 
            onClick={runCrudTest}
            className="w-full mt-3"
            variant="outline"
            size="sm"
          >
            CRUD テスト実行
          </Button>
        </div>

        <Button 
          onClick={checkConnection}
          disabled={isChecking}
          className="w-full"
          variant="outline"
        >
          {isChecking ? "確認中..." : "基本接続を再確認"}
        </Button>
      </CardContent>
    </Card>
  )
}
