import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    const body = await request.json()
    const { action, tables } = body

    if (action === 'check') {
      // データ状況をチェック
      const checks = await Promise.all([
        // PDF uploads テーブルの確認
        adminClient
          .from('pdf_uploads')
          .select('id, file_name, upload_date, file_size')
          .order('upload_date', { ascending: false }),
        
        // Questions テーブルの確認
        adminClient
          .from('questions')
          .select('id, question_text, created_at')
          .order('created_at', { ascending: false }),

        // Question sets テーブルの確認  
        adminClient
          .from('question_sets')
          .select('id, title, created_at, questions(count)')
          .order('created_at', { ascending: false })
      ])

      const [pdfUploads, questions, questionSets] = checks

      return NextResponse.json({
        success: true,
        data: {
          pdfUploads: {
            count: pdfUploads.data?.length || 0,
            data: pdfUploads.data || [],
            error: pdfUploads.error
          },
          questions: {
            count: questions.data?.length || 0,
            recent: questions.data?.slice(0, 5) || [],
            error: questions.error
          },
          questionSets: {
            count: questionSets.data?.length || 0,
            data: questionSets.data || [],
            error: questionSets.error
          }
        }
      })
    }

    if (action === 'cleanup') {
      if (!tables || !Array.isArray(tables)) {
        return NextResponse.json({
          success: false,
          error: 'tables array is required for cleanup action'
        }, { status: 400 })
      }

      const results = []

      // PDF uploads データの削除
      if (tables.includes('pdf_uploads')) {
        try {
          // まず全件削除を試行
          const { count, error } = await adminClient
            .from('pdf_uploads')
            .delete()
            .gte('created_at', '1900-01-01') // 日付条件で全件削除

          if (error && error.message.includes('uuid')) {
            // UUIDエラーの場合は別の方法で削除
            const { data: allRows } = await adminClient
              .from('pdf_uploads')
              .select('id')
            
            if (allRows && allRows.length > 0) {
              const deletePromises = allRows.map(row => 
                adminClient
                  .from('pdf_uploads')
                  .delete()
                  .eq('id', row.id)
              )
              await Promise.all(deletePromises)
            }
            
            results.push({
              table: 'pdf_uploads',
              success: true,
              error: null,
              deletedCount: allRows?.length || 0
            })
          } else {
            results.push({
              table: 'pdf_uploads',
              success: !error,
              error: error?.message,
              deletedCount: count || 0
            })
          }
        } catch (err: any) {
          results.push({
            table: 'pdf_uploads',
            success: false,
            error: err.message,
            deletedCount: 0
          })
        }
      }

      // Questions データの削除
      if (tables.includes('questions')) {
        const { count, error } = await adminClient
          .from('questions')
          .delete()
          .gt('id', 0) // 全件削除

        results.push({
          table: 'questions',
          success: !error,
          error: error?.message,
          deletedCount: count || 0
        })
      }

      // Question sets データの削除
      if (tables.includes('question_sets')) {
        const { count, error } = await adminClient
          .from('question_sets')
          .delete()
          .gt('id', 0) // 全件削除

        results.push({
          table: 'question_sets',
          success: !error,
          error: error?.message,
          deletedCount: count || 0
        })
      }

      return NextResponse.json({
        success: true,
        message: 'クリーンアップが完了しました',
        results
      })
    }

    if (action === 'reset-sequences') {
      // シーケンスをリセット（PostgreSQL）
      const resetQueries = [
        "SELECT setval('questions_id_seq', 1, false);",
        "SELECT setval('question_sets_id_seq', 1, false);",
        "SELECT setval('pdf_uploads_id_seq', 1, false);"
      ]

      const results = []
      for (const query of resetQueries) {
        try {
          const { data, error } = await adminClient.rpc('execute_sql', { 
            sql_query: query 
          })
          results.push({
            query,
            success: !error,
            error: error?.message,
            result: data
          })
        } catch (err: any) {
          results.push({
            query,
            success: false,
            error: err.message
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: 'シーケンスリセットが完了しました',
        results
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use: check, cleanup, or reset-sequences'
    }, { status: 400 })

  } catch (error: any) {
    console.error('PDFデータクリーンアップエラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'クリーンアップ処理でエラーが発生しました'
    }, { status: 500 })
  }
}

export async function GET() {
  // GETリクエストでデータ状況をチェック
  try {
    const adminClient = createServerClient()

    const [pdfCount, questionCount, questionSetCount] = await Promise.all([
      adminClient
        .from('pdf_uploads')
        .select('id', { count: 'exact', head: true }),
      adminClient
        .from('questions')
        .select('id', { count: 'exact', head: true }),
      adminClient
        .from('question_sets')
        .select('id', { count: 'exact', head: true })
    ])

    return NextResponse.json({
      success: true,
      summary: {
        pdfUploads: pdfCount.count || 0,
        questions: questionCount.count || 0,
        questionSets: questionSetCount.count || 0
      },
      message: 'データベース状況を確認しました'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
