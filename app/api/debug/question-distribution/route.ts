import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const adminClient = createServerClient()
    
    console.log('🔍 問題分布デバッグ開始...')
    
    // カテゴリー別問題数を詳細調査
    const { data: categories, error: categoriesError } = await adminClient
      .from('categories')
      .select('*')
      .order('id')
    
    if (categoriesError) {
      throw new Error(`カテゴリー取得エラー: ${categoriesError.message}`)
    }
    
    console.log(`📁 カテゴリー数: ${categories?.length || 0}`)
    
    // 各カテゴリーの問題セット・問題数を調査
    const categoryAnalysis = []
    
    for (const category of categories || []) {
      console.log(`🔍 カテゴリー "${category.name}" (ID: ${category.id}) を調査中...`)
      
      // 問題セット数
      const { data: questionSets, error: setsError } = await adminClient
        .from('question_sets')
        .select('*')
        .eq('category_id', category.id)
      
      console.log(`📚 カテゴリー ${category.id} の問題セット数: ${questionSets?.length || 0}`)
      
      // カテゴリーIDで直接問題を検索
      const { data: directQuestions, error: directError } = await adminClient
        .from('questions')
        .select('*')
        .eq('category_id', category.id)
      
      console.log(`❓ カテゴリー ${category.id} の直接問題数: ${directQuestions?.length || 0}`)
      
      // 問題セット経由の問題数
      let setQuestions = []
      if (questionSets && questionSets.length > 0) {
        for (const set of questionSets) {
          const { data: setQs } = await adminClient
            .from('questions')
            .select('*')
            .eq('question_set_id', set.id)
          
          if (setQs) {
            setQuestions.push(...setQs)
          }
        }
      }
      
      console.log(`📋 カテゴリー ${category.id} の問題セット経由問題数: ${setQuestions.length}`)
      
      categoryAnalysis.push({
        category: {
          id: category.id,
          name: category.name,
          question_count: category.question_count || 0
        },
        questionSets: {
          count: questionSets?.length || 0,
          sets: questionSets?.map(set => ({
            id: set.id,
            name: set.name,
            category_id: set.category_id,
            total_questions: set.total_questions || 0,
            created_at: set.created_at
          })) || []
        },
        questions: {
          directCount: directQuestions?.length || 0,
          setBasedCount: setQuestions.length,
          totalCount: (directQuestions?.length || 0) + setQuestions.length,
          recentDirect: directQuestions?.slice(0, 3).map(q => ({
            id: q.id,
            question_set_id: q.question_set_id,
            category_id: q.category_id,
            question_number: q.question_number,
            question_text: q.question_text?.substring(0, 100) + '...',
            created_at: q.created_at
          })) || [],
          recentSetBased: setQuestions.slice(0, 3).map(q => ({
            id: q.id,
            question_set_id: q.question_set_id,
            category_id: q.category_id,
            question_number: q.question_number,
            question_text: q.question_text?.substring(0, 100) + '...',
            created_at: q.created_at
          }))
        }
      })
    }
    
    // 全問題数の確認
    const { data: allQuestions, error: allError } = await adminClient
      .from('questions')
      .select('id, category_id, question_set_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    
    console.log(`🔢 全問題数: ${allQuestions?.length || 0}`)
    
    // 孤立した問題の確認（category_idがnullまたは不正）
    const { data: orphanQuestions, error: orphanError } = await adminClient
      .from('questions')
      .select('*')
      .is('category_id', null)
    
    console.log(`🏝️ 孤立問題数: ${orphanQuestions?.length || 0}`)
    
    // 問題セットIDでグループ化
    const questionSetGroups: { [key: string]: any[] } = {}
    allQuestions?.forEach(q => {
      const setId = q.question_set_id || 'no-set'
      if (!questionSetGroups[setId]) {
        questionSetGroups[setId] = []
      }
      questionSetGroups[setId].push(q)
    })
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalCategories: categories?.length || 0,
        totalQuestions: allQuestions?.length || 0,
        orphanQuestions: orphanQuestions?.length || 0,
        questionSetGroups: Object.keys(questionSetGroups).length
      },
      categoryAnalysis,
      questionSetGroups: Object.entries(questionSetGroups).map(([setId, questions]) => ({
        questionSetId: setId,
        questionCount: questions.length,
        categoryIds: [...new Set(questions.map(q => q.category_id))],
        recentQuestions: questions.slice(0, 3)
      })),
      recentQuestions: allQuestions?.slice(0, 10) || [],
      orphanQuestions: orphanQuestions?.slice(0, 5) || []
    })
    
  } catch (error: any) {
    console.error('❌ 問題分布デバッグエラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
