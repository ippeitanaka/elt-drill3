import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { processQuizPDFs } from '@/lib/ocr-enhanced'

export async function POST(request: NextRequest) {
  try {
    const adminClient = createServerClient()
    const body = await request.json()
    
    console.log('📋 PDF処理リクエスト受信:', body)
    
    const { questionFileUrl, answerFileUrl, categoryId } = body

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    if (!questionFileUrl) {
      return NextResponse.json(
        { error: 'PDF file URL is required' },
        { status: 400 }
      )
    }

    console.log('🚀 大容量PDF処理開始:', {
      questionFileUrl,
      answerFileUrl,
      categoryId
    })

    let questions = []

    try {
      // 実際のPDFからOCRで問題を抽出
      console.log('📄 PDFファイルダウンロード開始...')
      
      // PDFファイルをダウンロード
      const pdfResponse = await fetch(questionFileUrl)
      if (!pdfResponse.ok) {
        throw new Error(`PDF download failed: ${pdfResponse.status} ${pdfResponse.statusText}`)
      }
      
      const pdfBuffer = await pdfResponse.arrayBuffer()
      const pdfFile = new File([pdfBuffer], 'questions.pdf', { type: 'application/pdf' })
      
      console.log(`📊 PDFファイル準備完了: ${(pdfFile.size / 1024 / 1024).toFixed(2)}MB`)
      
      // 解答PDFが指定されている場合はダウンロード
      let answerFile = undefined
      if (answerFileUrl) {
        console.log('📄 解答PDFダウンロード開始...')
        const answerResponse = await fetch(answerFileUrl)
        if (answerResponse.ok) {
          const answerBuffer = await answerResponse.arrayBuffer()
          answerFile = new File([answerBuffer], 'answers.pdf', { type: 'application/pdf' })
          console.log(`📊 解答PDFファイル準備完了: ${(answerFile.size / 1024 / 1024).toFixed(2)}MB`)
        } else {
          console.warn('⚠️ 解答PDFのダウンロードに失敗しました')
        }
      }
      
      // 高精度OCRで問題を抽出
      console.log('🔍 高精度OCR処理開始...')
      const ocrResult = await processQuizPDFs(pdfFile, answerFile)
      
      if (!ocrResult.questions || ocrResult.questions.length === 0) {
        throw new Error('PDFから問題を抽出できませんでした。ファイルが画像形式または読み取り困難な形式の可能性があります。')
      }
      
      questions = ocrResult.questions.map((q, index) => ({
        question_text: q.questionText,
        options: {
          a: q.choices[0] || '',
          b: q.choices[1] || '',
          c: q.choices[2] || '',
          d: q.choices[3] || '',
          e: q.choices[4] || ''
        },
        correct_answer: q.correctAnswer ? ['a', 'b', 'c', 'd', 'e'][q.correctAnswer - 1] : 'a'
      }))
      
      console.log(`✅ OCR処理完了: ${questions.length}問を抽出`)
      
    } catch (ocrError: any) {
      console.error('❌ OCR処理エラー:', {
        error: ocrError.message,
        stack: ocrError.stack,
        questionFileUrl,
        answerFileUrl
      })
      
      return NextResponse.json({
        success: false,
        error: `PDF処理エラー: ${ocrError.message}`,
        details: 'PDFファイルの内容を読み取れませんでした。ファイルが破損していないか、画像形式でないかご確認ください。'
      }, { status: 400 })
    }

    // 問題セットを作成
    const { data: newSet, error: setError } = await adminClient
      .from("question_sets")
      .insert({
        category_id: categoryId,
        name: `PDF抽出 - ${new Date().toLocaleDateString("ja-JP")}`,
      })
      .select()
      .single()

    if (setError) {
      console.error("❌ 問題セット作成エラー:", setError)
      return NextResponse.json(
        { error: `問題セット作成エラー: ${setError.message}` },
        { status: 500 }
      )
    }
    
    const questionSetId = newSet.id
    console.log(`📁 問題セット作成完了 (ID: ${questionSetId})`)

    // 問題をバッチで保存
    const batchSize = 10
    let savedCount = 0
    let totalErrors = 0
    
    console.log(`💾 データベース保存開始: ${questions.length}問`)
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize)
      
      const questionsToInsert = batch.map((q: any, index: number) => {
        return {
          question_set_id: questionSetId,
          question_text: q.question_text,
          question_number: i + index + 1,
          options: JSON.stringify(q.options),
          correct_answers: JSON.stringify([q.correct_answer])
        }
      })

      try {
        const { data, error: insertError } = await adminClient
          .from("questions")
          .insert(questionsToInsert)
          .select()

        if (insertError) {
          console.error(`❌ バッチ ${Math.floor(i / batchSize) + 1} 保存エラー:`, insertError)
          totalErrors += questionsToInsert.length
        } else {
          savedCount += questionsToInsert.length
          console.log(`✅ バッチ ${Math.floor(i / batchSize) + 1} 保存完了: ${questionsToInsert.length}問 (累計: ${savedCount}問)`)
        }
      } catch (batchError) {
        console.error(`💥 バッチ ${Math.floor(i / batchSize) + 1} 重大エラー:`, batchError)
        totalErrors += questionsToInsert.length
      }
      
      // バッチ間の短い待機
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    const successMessage = `🎉 PDF処理完了！${savedCount}問をデータベースに保存しました`
    console.log(successMessage)

    return NextResponse.json({
      success: true,
      data: {
        questionSetId,
        totalExtracted: questions.length,
        totalSaved: savedCount,
        totalErrors: totalErrors,
        extractedQuestions: questions.slice(0, 3), // サンプル表示用
      },
      message: successMessage
    })

  } catch (error: any) {
    console.error('❌ PDF処理エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'PDF処理でエラーが発生しました'
    }, { status: 500 })
  }
}
