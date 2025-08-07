import { NextRequest, NextResponse } from 'next/server'

// 純粋なOCR処理を強制実行するための専用API
export async function POST(request: NextRequest) {
  console.log('=== 純粋OCRテストAPI呼び出し ===')
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      )
    }
    
    console.log(`📁 ファイル受信: ${file.name} (${file.size} bytes)`)
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'PDFファイルを選択してください' },
        { status: 400 }
      )
    }
    
    // OCR処理開始時刻を記録
    const startTime = Date.now()
    console.log('⏱️ 純粋OCR処理開始時刻:', new Date().toISOString())
    
    // FileをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // 直接OCR処理を呼び出し
    const extractedText = await extractTextWithPureOCR(uint8Array)
    
    const endTime = Date.now()
    const processingTime = endTime - startTime
    
    console.log('⏱️ 純粋OCR処理完了時刻:', new Date().toISOString())
    console.log(`⏱️ 処理時間: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}秒)`)
    
    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      textLength: extractedText.length,
      processingTimeMs: processingTime,
      processingTimeSec: Math.round(processingTime / 1000),
      textPreview: extractedText.substring(0, 2000) + (extractedText.length > 2000 ? '...' : ''),
      extractedAt: new Date().toISOString(),
      note: 'Tesseract.js OCRで純粋に処理されました（フォールバックなし）'
    })
    
  } catch (error: any) {
    console.error('❌ 純粋OCRテストAPIエラー:', error)
    
    return NextResponse.json(
      { 
        error: '純粋OCR処理に失敗しました',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Tesseract.js OCRを純粋に使用したテキスト抽出（フォールバックなし）
async function extractTextWithPureOCR(uint8Array: Uint8Array): Promise<string> {
  console.log('🤖 純粋Tesseract.js OCR処理開始...')
  
  try {
    const Tesseract = await import('tesseract.js')
    const pdfjsLib = await import('pdfjs-dist')
    
    // Vercel環境でのWorker設定を無効化
    if (typeof window === 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = ''
    }
    
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      stopAtErrors: false,
      useWorkerFetch: false,
      isEvalSupported: false
    })
    
    const pdf = await loadingTask.promise
    console.log(`🤖 純粋OCR: ${pdf.numPages}ページを処理開始`)
    
    let allOcrText = ''
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        console.log(`🤖 ページ ${pageNum}/${pdf.numPages} 純粋OCR処理中...`)
        
        const page = await pdf.getPage(pageNum)
        
        // PDFページを画像に変換
        const viewport = page.getViewport({ scale: 2.0 }) // 高解像度で処理
        
        // Canvasを使用してページを画像として描画
        const { createCanvas } = await import('canvas')
        const canvas = createCanvas(viewport.width, viewport.height)
        const context = canvas.getContext('2d')
        
        const renderContext = {
          canvasContext: context as any, // 型エラー回避のためanyでキャスト
          viewport: viewport
        }
        
        await page.render(renderContext).promise
        
        // CanvasをBase64画像に変換してTesseract.jsに渡す
        const dataUrl = canvas.toDataURL('image/png')
        
        console.log(`📊 ページ ${pageNum}: Canvas生成完了 (${viewport.width}x${viewport.height}), OCR開始...`)
        
        // Tesseract.jsでOCR処理（Worker設定を明示的に指定）
        const worker = await Tesseract.default.createWorker('jpn+eng', 1, {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              console.log(`📊 ページ ${pageNum} OCR進捗: ${Math.round(m.progress * 100)}%`)
            }
          }
        })
        
        const ocrResult = await worker.recognize(dataUrl)
        const pageText = ocrResult.data.text.trim()
        
        await worker.terminate() // メモリリークを防ぐ
        
        if (pageText.length > 0) {
          allOcrText += `\n=== ページ ${pageNum} (純粋OCR) ===\n${pageText}\n`
          console.log(`✅ ページ ${pageNum} OCR完了: ${pageText.length}文字`)
          console.log(`📄 ページ ${pageNum} OCRテキスト例: ${pageText.substring(0, 200)}...`)
        } else {
          console.warn(`⚠️ ページ ${pageNum}: OCRでテキストが検出されませんでした`)
          allOcrText += `\n=== ページ ${pageNum} (純粋OCR) ===\n(テキストが検出されませんでした)\n`
        }
        
      } catch (pageError: any) {
        console.error(`❌ ページ ${pageNum} OCRエラー:`, pageError)
        allOcrText += `\n=== ページ ${pageNum} (OCRエラー) ===\nOCR処理でエラーが発生: ${pageError.message}\n`
        continue
      }
    }
    
    if (allOcrText.trim().length === 0) {
      throw new Error('純粋OCR処理でテキストが抽出されませんでした')
    }
    
    console.log(`🎯 純粋OCR処理完了: 合計${allOcrText.length}文字抽出`)
    return allOcrText.trim()
    
  } catch (error: any) {
    console.error('❌ 純粋OCR処理エラー:', error)
    throw new Error(`純粋OCR処理に失敗しました: ${error.message}`)
  }
}

export async function GET() {
  return NextResponse.json({
    message: '純粋OCRテストAPI',
    usage: 'POST /api/pure-ocr-test with file parameter',
    description: 'Tesseract.js OCRを純粋に実行してPDFファイルの文字認識をテストします（フォールバック処理なし）。',
    timestamp: new Date().toISOString()
  })
}
