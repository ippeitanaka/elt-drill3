import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    console.log('🔍 デバッグ情報収集開始...')
    
    // PDFファイルの確認
    const { data: pdfFiles, error: pdfError } = await adminClient
      .storage
      .from('pdfs')
      .list()
    
    console.log(`📁 PDFファイル数: ${pdfFiles?.length || 0}`)
    
    // 問題セットテーブルの確認（最新10件を詳細情報付きで）
    const { data: questionSets, error: setsError } = await adminClient
      .from('question_sets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log(`📚 問題セット数: ${questionSets?.length || 0}`)
    
    // 問題テーブルの確認（最新20件を詳細情報付きで）
    const { data: questions, error: questionsError } = await adminClient
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    console.log(`❓ 問題数: ${questions?.length || 0}`)
    
    // カテゴリ情報の確認
    const { data: categories, error: categoriesError } = await adminClient
      .from('categories')
      .select('*')
    
    console.log(`📁 カテゴリ数: ${categories?.length || 0}`)
    
    // 最新のアップロード履歴を確認
    const recentQuestionSets = questionSets?.slice(0, 3) || []
    const recentQuestions = questions?.slice(0, 5) || []
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        pdfFiles: {
          count: pdfFiles?.length || 0,
          files: pdfFiles?.map(file => ({
            name: file.name,
            size: file.metadata?.size,
            updated_at: file.updated_at
          })) || [],
          error: pdfError?.message
        },
        questionSets: {
          count: questionSets?.length || 0,
          recent: recentQuestionSets.map(set => ({
            id: set.id,
            title: set.title,
            description: set.description,
            category_id: set.category_id,
            total_questions: set.total_questions,
            created_at: set.created_at,
            pdf_filename: set.pdf_filename
          })),
          error: setsError?.message
        },
        questions: {
          count: questions?.length || 0,
          recent: recentQuestions.map(q => ({
            id: q.id,
            question_set_id: q.question_set_id,
            question_text: q.question_text?.substring(0, 100) + '...',
            choices: q.choices,
            difficulty: q.difficulty,
            created_at: q.created_at
          })),
          error: questionsError?.message
        },
        categories: {
          count: categories?.length || 0,
          data: categories?.map(cat => ({
            id: cat.id,
            name: cat.name,
            question_count: cat.question_count
          })) || [],
          error: categoriesError?.message
        },
        pipeline_analysis: {
          pdf_to_questionset_gap: (pdfFiles?.length || 0) - (questionSets?.length || 0),
          questionset_to_question_gap: (questionSets?.reduce((sum, set) => sum + (set.total_questions || 0), 0) || 0) - (questions?.length || 0),
          recent_activity: {
            latest_questionset: recentQuestionSets[0]?.created_at || 'なし',
            latest_question: recentQuestions[0]?.created_at || 'なし'
          }
        }
      }
    })
    
  } catch (error: any) {
    console.error('❌ デバッグ情報収集エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
