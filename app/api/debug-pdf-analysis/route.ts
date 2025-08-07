import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromPDF } from '@/lib/ocr-enhanced'
import { parseMedicalQuestions } from '@/lib/medical-question-parser'

export async function POST(request: NextRequest) {
  console.log('🔍 PDF詳細分析デバッグAPI開始')
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'PDFファイルが必要です' }, { status: 400 })
    }
    
    console.log(`📄 分析対象ファイル: ${file.name} (${file.size} bytes)`)
    
    // Step 1: テキスト抽出
    console.log('🔍 テキスト抽出開始...')
    const extractedText = await extractTextFromPDF(file)
    
    if (!extractedText) {
      return NextResponse.json({
        success: false,
        error: 'PDFからテキストを抽出できませんでした',
        textLength: 0,
        rawText: ''
      })
    }
    
    console.log(`📝 抽出されたテキスト長: ${extractedText.length}文字`)
    
    // Step 2: テキスト分析
    const lines = extractedText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    const firstLines = lines.slice(0, 50)
    
    // Step 3: パターン分析
    const analysisResults = {
      // 基本情報
      textLength: extractedText.length,
      totalLines: lines.length,
      firstLines: firstLines,
      
      // パターン検出
      hasNumbers: /\d+/.test(extractedText),
      hasJapanese: /[ひらがな-カタカナ一-龠]/.test(extractedText),
      hasEnglish: /[a-zA-Z]/.test(extractedText),
      
      // 問題パターン検出
      questionPatterns: {
        standardQ: (extractedText.match(/(?:問題?|Question|Q)\s*\d+/gi) || []).length,
        numberedQ: (extractedText.match(/^\d+\s*[．.\)）]/gm) || []).length,
        prefixedQ: (extractedText.match(/^(?:第)?\d+(?:問目?|番目?)/gm) || []).length,
        noStyleQ: (extractedText.match(/^(?:No\.?|#)\s*\d+/gm) || []).length,
      },
      
      // 選択肢パターン検出
      choicePatterns: {
        numbered: (extractedText.match(/^[1-5]\s*[．.\)）]/gm) || []).length,
        alphabetic: (extractedText.match(/^[a-eA-E]\s*[．.\)）]/gm) || []).length,
        hiragana: (extractedText.match(/^[ア-オ]\s*[．.\)）]/gm) || []).length,
        parenthesis: (extractedText.match(/^\([1-5a-eA-Eア-オ]\)/gm) || []).length,
        indented: (extractedText.match(/^\s+[1-5a-eA-Eア-オ]\s*[．.\)）]/gm) || []).length,
      },
      
      // 医療キーワード検出
      medicalKeywords: {
        patients: (extractedText.match(/患者|症例|病態|治療|診断|症状/g) || []).length,
        medical: (extractedText.match(/薬物|投与|処置|手術|検査|感染|疾患|病原体|臨床|医療/g) || []).length,
        emergency: (extractedText.match(/救急|蘇生|CPR|AED|心停止/g) || []).length,
      }
    }
    
    // Step 4: 医療問題パーサーを試行
    console.log('🏥 医療問題パーサーを試行...')
    const parseResult = parseMedicalQuestions(extractedText)
    
    // Step 5: サンプルテキスト（最初の1000文字）
    const sampleText = extractedText.substring(0, 1000)
    
    return NextResponse.json({
      success: true,
      analysis: analysisResults,
      parseResult: {
        questionsFound: parseResult.questions.length,
        questions: parseResult.questions.slice(0, 3), // 最初の3問のみ
      },
      sampleText: sampleText,
      recommendations: generateRecommendations(analysisResults, parseResult)
    })
    
  } catch (error: any) {
    console.error('❌ PDF分析エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'PDF分析中にエラーが発生しました'
    }, { status: 500 })
  }
}

function generateRecommendations(analysis: any, parseResult: any): string[] {
  const recommendations = []
  
  if (analysis.textLength < 100) {
    recommendations.push('PDFのテキスト量が少なすぎます。高解像度のPDFを使用してください')
  }
  
  if (!analysis.hasJapanese && !analysis.hasEnglish) {
    recommendations.push('テキストが正しく抽出されていない可能性があります。OCR品質を確認してください')
  }
  
  if (analysis.questionPatterns.standardQ === 0 && analysis.questionPatterns.numberedQ === 0) {
    recommendations.push('問題番号パターンが検出されません。「問1」「1.」などの形式を確認してください')
  }
  
  if (Object.values(analysis.choicePatterns).every((count: any) => count === 0)) {
    recommendations.push('選択肢パターンが検出されません。「1.」「a.」「ア.」などの形式を確認してください')
  }
  
  if (analysis.medicalKeywords.patients === 0 && analysis.medicalKeywords.medical === 0) {
    recommendations.push('医療関連キーワードが検出されません。医療問題PDFかどうか確認してください')
  }
  
  if (parseResult.questionsFound === 0) {
    recommendations.push('パーサーが問題を検出できませんでした。PDF形式を確認するか、手動入力を検討してください')
  }
  
  return recommendations
}
