import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { processQuizPDFsBatch, type ProcessingProgress, type BatchProcessResult } from '@/lib/ocr-optimized'

interface BatchJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: ProcessingProgress
  result?: BatchProcessResult
  error?: string
  createdAt: string
  updatedAt: string
}

// 進行中のジョブを管理
const activeJobs = new Map<string, BatchJob>()

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    const formData = await request.formData()
    
    const questionFile = formData.get('questionFile') as File
    const answerFile = formData.get('answerFile') as File | null
    const categoryId = formData.get('categoryId') as string
    const batchSize = parseInt(formData.get('batchSize') as string) || 5
    const maxPages = parseInt(formData.get('maxPages') as string) || 100
    const quality = (formData.get('quality') as string) || 'medium'

    if (!questionFile || !categoryId) {
      return NextResponse.json(
        { error: 'Question file and category are required' },
        { status: 400 }
      )
    }

    // ジョブIDを生成
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // ジョブを初期化
    const job: BatchJob = {
      id: jobId,
      status: 'pending',
      progress: {
        currentPage: 0,
        totalPages: 0,
        extractedQuestions: 0,
        status: 'processing',
        message: 'バッチ処理を開始しています...'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    activeJobs.set(jobId, job)

    // 非同期でバッチ処理を開始
    processPDFBatch(jobId, questionFile, answerFile, categoryId, {
      batchSize,
      maxPages,
      quality: quality as 'low' | 'medium' | 'high'
    }).catch(error => {
      console.error(`バッチジョブ ${jobId} でエラー:`, error)
      const failedJob = activeJobs.get(jobId)
      if (failedJob) {
        failedJob.status = 'failed'
        failedJob.error = error.message
        failedJob.updatedAt = new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      jobId,
      message: 'バッチ処理を開始しました',
      estimatedTime: `${Math.ceil(questionFile.size / 100000)}分程度`
    })

  } catch (error: any) {
    console.error('バッチ処理開始エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const jobId = url.searchParams.get('jobId')

    if (jobId) {
      // 特定のジョブの状況を取得
      const job = activeJobs.get(jobId)
      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        job
      })
    } else {
      // 全てのアクティブジョブを取得
      const jobs = Array.from(activeJobs.values())
      return NextResponse.json({
        success: true,
        jobs: jobs.map(job => ({
          id: job.id,
          status: job.status,
          progress: job.progress,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt
        }))
      })
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// バッチ処理の実行
async function processPDFBatch(
  jobId: string,
  questionFile: File,
  answerFile: File | null,
  categoryId: string,
  options: {
    batchSize: number
    maxPages: number
    quality: 'low' | 'medium' | 'high'
  }
) {
  const job = activeJobs.get(jobId)
  if (!job) throw new Error('Job not found')

  try {
    job.status = 'processing'
    job.updatedAt = new Date().toISOString()

    // 進捗更新コールバック
    const onProgress = (progress: ProcessingProgress) => {
      const currentJob = activeJobs.get(jobId)
      if (currentJob) {
        currentJob.progress = progress
        currentJob.updatedAt = new Date().toISOString()
        console.log(`ジョブ ${jobId} 進捗:`, progress)
      }
    }

    // 最適化されたOCR処理を実行
    const result = await processQuizPDFsBatch(
      questionFile,
      answerFile || undefined,
      {
        ...options,
        onProgress
      }
    )

    if (result.success && result.extractedQuestions.length > 0) {
      // データベースに保存
      await saveQuestionsToDatabase(categoryId, result.extractedQuestions, questionFile.name)
      
      job.status = 'completed'
      job.result = result
      job.progress.status = 'completed'
      job.progress.message = `完了: ${result.extractedQuestions.length}問を抽出・保存しました`
    } else {
      throw new Error('OCR処理で問題を抽出できませんでした')
    }

  } catch (error: any) {
    console.error(`バッチ処理エラー (${jobId}):`, error)
    job.status = 'failed'
    job.error = error.message
    job.progress.status = 'error'
    job.progress.message = `エラー: ${error.message}`
  } finally {
    job.updatedAt = new Date().toISOString()
    
    // 1時間後にジョブをクリーンアップ
    setTimeout(() => {
      activeJobs.delete(jobId)
      console.log(`ジョブ ${jobId} をクリーンアップしました`)
    }, 60 * 60 * 1000)
  }
}

// データベースに問題を保存
async function saveQuestionsToDatabase(
  categoryId: string,
  questions: any[],
  fileName: string
) {
  const adminClient = createServerClient()

  // 問題セットを作成
  const questionSetName = `${fileName.replace('.pdf', '')} - 自動抽出 (${new Date().toLocaleDateString()})`
  
  const { data: questionSet, error: setError } = await adminClient
    .from('question_sets')
    .insert([{
      category_id: parseInt(categoryId),
      name: questionSetName
    }])
    .select()
    .single()

  if (setError) {
    throw new Error(`問題セット作成エラー: ${setError.message}`)
  }

  // 問題を分割して保存（大量データ対応）
  const batchSize = 50
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize)
    
    const questionsToInsert = batch.map((q, index) => ({
      question_set_id: questionSet.id,
      question_number: i + index + 1,
      question_text: q.questionText,
      options: q.choices,
      correct_answers: q.correctAnswer !== undefined ? [q.correctAnswer] : [0]
    }))

    const { error: questionsError } = await adminClient
      .from('questions')
      .insert(questionsToInsert)

    if (questionsError) {
      throw new Error(`問題保存エラー (バッチ ${Math.floor(i/batchSize) + 1}): ${questionsError.message}`)
    }

    console.log(`バッチ ${Math.floor(i/batchSize) + 1} 保存完了: ${questionsToInsert.length}問`)
  }

  console.log(`全 ${questions.length}問の保存が完了しました`)
}
