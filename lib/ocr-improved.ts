import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'

// PDF.js worker設定
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'

export interface ParsedQuestion {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_e: string
  correct_answer?: "A" | "B" | "C" | "D" | "E"
}

export interface ParsedAnswers {
  [questionNumber: string]: "A" | "B" | "C" | "D" | "E"
}

// 強化されたPDF抽出関数
async function enhancedPdfToText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist")
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let fullText = ""

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`ページ ${pageNum}/${pdf.numPages} 処理中...`)
      
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      // テキストアイテムを位置情報と共に処理
      const textItems = textContent.items.map((item: any) => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height
      }))

      // Y座標でソートして読み順を整理
      textItems.sort((a, b) => b.y - a.y || a.x - b.x)

      // テキストを結合（適切な改行を追加）
      let pageText = ""
      let lastY = null
      for (const item of textItems) {
        if (lastY !== null && Math.abs(lastY - item.y) > 5) {
          pageText += "\n"
        }
        pageText += item.text + " "
        lastY = item.y
      }

      fullText += pageText + "\n\n"
    }

    return fullText
  } catch (error) {
    console.error("Enhanced PDF text extraction failed:", error)
    throw new Error("PDFからのテキスト抽出に失敗しました")
  }
}

// 強化された問題抽出関数
function enhancedParseQuestions(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  
  console.log("Enhanced 問題解析開始")
  console.log("テキスト長:", text.length, "文字")
  console.log("テキスト抜粋:", text.substring(0, 800))

  // より積極的な正規化
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')  // NON-BREAKING SPACE
    .replace(/\u3000/g, ' ')  // 全角スペース
    .replace(/\s+/g, ' ')     // 複数スペースを1つに
    .replace(/\n\s+/g, '\n')  // 行頭スペース除去
    .trim()

  // 超柔軟な問題パターン（順番を調整）
  const questionPatterns = [
    // パターン1: 第N問 または 第 N 問
    {
      pattern: /第\s*(\d+)\s*問\s*((?:(?!第\s*\d+\s*問).)*?)(?=第\s*\d+\s*問|$)/gsi,
      name: "第N問"
    },
    // パターン2: 問N または 問 N
    {
      pattern: /(?:^|\n)\s*問\s*(\d+)\s*[.．：:\s]*\s*((?:(?!(?:^|\n)\s*問\s*\d+).)*?)(?=(?:^|\n)\s*問\s*\d+|$)/gsi,
      name: "問N"
    },
    // パターン3: N. または N．
    {
      pattern: /(?:^|\n)\s*(\d+)\s*[.．]\s*((?:(?!(?:^|\n)\s*\d+\s*[.．]).)*?)(?=(?:^|\n)\s*\d+\s*[.．]|$)/gsi,
      name: "N."
    },
    // パターン4: 【N】 または 【問N】
    {
      pattern: /【\s*(?:問\s*)?(\d+)\s*】\s*((?:(?!【\s*(?:問\s*)?\d+\s*】).)*?)(?=【\s*(?:問\s*)?\d+\s*】|$)/gsi,
      name: "【N】"
    },
    // パターン5: (N) または （N）
    {
      pattern: /[（(]\s*(\d+)\s*[）)]\s*((?:(?![（(]\s*\d+\s*[）)]).)*?)(?=[（(]\s*\d+\s*[）)]|$)/gsi,
      name: "(N)"
    },
    // パターン6: QN または Q N
    {
      pattern: /Q\s*(\d+)\s*[.．：:\s]*\s*((?:(?!Q\s*\d+).)*?)(?=Q\s*\d+|$)/gsi,
      name: "QN"
    }
  ]

  let bestMatch = { matches: [], patternName: "", patternIndex: -1 }

  // 各パターンを試行して最も多くマッチするものを選択
  for (let i = 0; i < questionPatterns.length; i++) {
    const { pattern, name } = questionPatterns[i]
    const matches = Array.from(normalizedText.matchAll(pattern))
    
    console.log(`パターン "${name}" でのマッチ数:`, matches.length)
    
    if (matches.length > bestMatch.matches.length) {
      bestMatch = {
        matches,
        patternName: name,
        patternIndex: i
      }
    }

    // デバッグ: マッチ内容の確認
    matches.slice(0, 3).forEach((match, idx) => {
      console.log(`  マッチ${idx + 1}: 問題${match[1]}, 内容: "${match[2].substring(0, 100)}..."`)
    })
  }

  if (bestMatch.matches.length === 0) {
    console.log("問題パターンが見つかりませんでした")
    console.log("テキストサンプル:")
    console.log(normalizedText.substring(0, 1500))
    return questions
  }

  console.log(`使用パターン: "${bestMatch.patternName}" (${bestMatch.matches.length}問)`)

  // マッチした問題を処理
  for (const match of bestMatch.matches) {
    const questionNumber = match[1]
    const questionContent = match[2]?.trim() || ''
    
    if (questionContent.length < 20) {
      console.log(`問題${questionNumber}: 内容が短すぎます (${questionContent.length}文字)`)
      continue
    }
    
    console.log(`\n=== 問題${questionNumber}の処理 ===`)
    console.log(`内容長: ${questionContent.length}文字`)
    console.log(`内容抜粋: "${questionContent.substring(0, 200)}..."`)

    // 超柔軟な選択肢抽出
    const { questionText, options } = extractOptionsFromContent(questionContent)

    if (Object.keys(options).length >= 2 && questionText.length > 10) {
      const question: ParsedQuestion = {
        question_text: questionText,
        option_a: options['A'] || '',
        option_b: options['B'] || '',
        option_c: options['C'] || '',
        option_d: options['D'] || '',
        option_e: options['E'] || '',
      }

      console.log(`✓ 問題${questionNumber}を追加`)
      console.log(`  問題文: "${question.question_text.substring(0, 80)}..."`)
      console.log(`  選択肢数: ${Object.keys(options).length}`)
      Object.entries(options).forEach(([key, value]) => {
        console.log(`    ${key}: "${value.substring(0, 40)}..."`)
      })

      questions.push(question)
    } else {
      console.log(`✗ 問題${questionNumber}をスキップ: 選択肢${Object.keys(options).length}個, 問題文${questionText.length}文字`)
    }
  }

  console.log(`\n=== 抽出完了 ===`)
  console.log(`合計 ${questions.length}問 を抽出しました`)
  return questions
}

// 選択肢抽出の専用関数
function extractOptionsFromContent(content: string): { questionText: string, options: { [key: string]: string } } {
  let options: { [key: string]: string } = {}
  let questionText = content

  // 多様な選択肢パターン
  const optionPatterns = [
    // A. テキスト または A） テキスト
    {
      pattern: /([ABCDE])\s*[.．)）：:]\s*([^\n\r]*?)(?=\s*[ABCDE]\s*[.．)）：:]|\s*$)/gsi,
      name: "A."
    },
    // (A) テキスト または （A） テキスト
    {
      pattern: /[（(]\s*([ABCDE])\s*[）)]\s*([^\n\r]*?)(?=\s*[（(]\s*[ABCDE]\s*[）)]|\s*$)/gsi,
      name: "(A)"
    },
    // a. テキスト（小文字）
    {
      pattern: /([abcde])\s*[.．)）：:]\s*([^\n\r]*?)(?=\s*[abcde]\s*[.．)）：:]|\s*$)/gsi,
      name: "a."
    },
    // ①テキスト ②テキスト
    {
      pattern: /([①②③④⑤])\s*([^\n\r]*?)(?=\s*[①②③④⑤]|\s*$)/gsi,
      name: "①"
    },
    // 1)A. テキスト（番号付き）
    {
      pattern: /\d+\s*[)）]\s*([ABCDE])\s*[.．]\s*([^\n\r]*?)(?=\s*\d+\s*[)）]\s*[ABCDE]|\s*$)/gsi,
      name: "1)A."
    }
  ]

  let bestOptions = {}
  let bestPatternName = ""

  for (const { pattern, name } of optionPatterns) {
    const matches = Array.from(content.matchAll(pattern))
    console.log(`    選択肢パターン "${name}": ${matches.length}個`)
    
    if (matches.length >= 2) {
      const tempOptions: { [key: string]: string } = {}
      
      for (const match of matches) {
        let letter = match[1].toUpperCase()
        const text = match[2].trim()
        
        // 特殊文字を通常文字に変換
        if (name === "①") {
          const mapping: { [key: string]: string } = {
            '①': 'A', '②': 'B', '③': 'C', '④': 'D', '⑤': 'E'
          }
          letter = mapping[match[1]] || match[1]
        }
        
        if (text && text.length > 0 && letter.match(/[ABCDE]/)) {
          tempOptions[letter] = text
          console.log(`      ${letter}: "${text.substring(0, 30)}..."`)
        }
      }
      
      if (Object.keys(tempOptions).length > Object.keys(bestOptions).length) {
        bestOptions = tempOptions
        bestPatternName = name
      }
    }
  }

  if (Object.keys(bestOptions).length > 0) {
    console.log(`    最適選択肢パターン: "${bestPatternName}" (${Object.keys(bestOptions).length}個)`)
    options = bestOptions
    
    // 問題文から選択肢部分を除去
    const firstOptionPattern = new RegExp(`${Object.keys(options)[0]}\\s*[.．)）：:]`, 'i')
    const firstOptionMatch = content.match(firstOptionPattern)
    if (firstOptionMatch) {
      const firstOptionIndex = content.indexOf(firstOptionMatch[0])
      questionText = content.substring(0, firstOptionIndex).trim()
    }
  }

  return { questionText, options }
}

// 強化された解答抽出関数
function enhancedParseAnswers(text: string): ParsedAnswers {
  const answers: ParsedAnswers = {}
  
  console.log("Enhanced 解答解析開始")
  console.log("解答テキスト長:", text.length, "文字")
  console.log("解答テキスト抜粋:", text.substring(0, 500))

  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')

  // 強化された解答パターン
  const answerPatterns = [
    // 問1 A, 問2 B...
    { pattern: /問\s*(\d+)\s*[：:：．.\s]*([ABCDE])/gi, name: "問N A" },
    // 1. A, 2. B...
    { pattern: /(\d+)\s*[.．]\s*([ABCDE])/gi, name: "N. A" },
    // 1) A, 2) B...
    { pattern: /(\d+)\s*[)）]\s*([ABCDE])/gi, name: "N) A" },
    // 1-A, 2-B...
    { pattern: /(\d+)\s*[-－]\s*([ABCDE])/gi, name: "N-A" },
    // 【1】A, 【2】B...
    { pattern: /【\s*(\d+)\s*】\s*([ABCDE])/gi, name: "【N】A" },
    // (1)A, (2)B...
    { pattern: /[（(]\s*(\d+)\s*[）)]\s*([ABCDE])/gi, name: "(N)A" },
    // 第1問 A
    { pattern: /第\s*(\d+)\s*問\s*([ABCDE])/gi, name: "第N問 A" },
    // 1番 A
    { pattern: /(\d+)\s*番\s*([ABCDE])/gi, name: "N番 A" },
    // Q1 A
    { pattern: /Q\s*(\d+)\s*([ABCDE])/gi, name: "QN A" },
    // 答え1: A
    { pattern: /答え?\s*(\d+)\s*[：:]\s*([ABCDE])/gi, name: "答えN: A" }
  ]

  let bestAnswers = {}
  let bestPatternName = ""

  for (const { pattern, name } of answerPatterns) {
    const matches = Array.from(normalizedText.matchAll(pattern))
    console.log(`解答パターン "${name}": ${matches.length}個`)
    
    if (matches.length > 0) {
      const tempAnswers: ParsedAnswers = {}
      for (const match of matches) {
        const questionNum = match[1]
        const answer = match[2].toUpperCase() as "A" | "B" | "C" | "D" | "E"
        tempAnswers[questionNum] = answer
        console.log(`  問題${questionNum}: ${answer}`)
      }
      
      if (Object.keys(tempAnswers).length > Object.keys(bestAnswers).length) {
        bestAnswers = tempAnswers
        bestPatternName = name
      }
    }
  }

  console.log(`最適解答パターン: "${bestPatternName}" (${Object.keys(bestAnswers).length}個)`)
  return bestAnswers
}

// Enhanced OCR関数
async function enhancedPdfToImageOCR(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist")
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let fullText = ""

    console.log(`Enhanced OCR処理開始: ${pdf.numPages}ページ`)

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`Enhanced ページ ${pageNum}/${pdf.numPages} OCR処理中...`)
      
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 4.0 }) // さらに高解像度

      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")!
      canvas.height = viewport.height
      canvas.width = viewport.width

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise

      // 高品質OCR設定
      const { data: { text } } = await Tesseract.recognize(
        canvas,
        'jpn+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR進捗: ${Math.round(m.progress * 100)}%`)
            }
          },
        }
      )

      fullText += text + "\n\n"
      console.log(`ページ${pageNum} OCR完了: ${text.length}文字`)
    }

    return fullText
  } catch (error) {
    console.error("Enhanced OCR処理失敗:", error)
    throw new Error("Enhanced PDFのOCR処理に失敗しました")
  }
}

// メイン抽出関数
export async function enhancedExtractQuestions(file: File): Promise<ParsedQuestion[]> {
  try {
    console.log("Enhanced PDF問題抽出開始:", file.name)
    
    let text = ""
    try {
      text = await enhancedPdfToText(file)
      console.log("Enhanced PDF.js抽出成功")
    } catch (error) {
      console.log("Enhanced PDF.js失敗、OCR実行...")
      text = await enhancedPdfToImageOCR(file)
      console.log("Enhanced OCR実行成功")
    }
    
    const questions = enhancedParseQuestions(text)
    console.log(`Enhanced抽出完了: ${questions.length}問`)
    
    return questions
  } catch (error: any) {
    console.error("Enhanced問題抽出エラー:", error)
    throw new Error(`Enhanced問題の抽出に失敗しました: ${error.message}`)
  }
}

export async function enhancedExtractAnswers(file: File): Promise<ParsedAnswers> {
  try {
    console.log("Enhanced PDF解答抽出開始:", file.name)
    
    let text = ""
    try {
      text = await enhancedPdfToText(file)
    } catch (error) {
      text = await enhancedPdfToImageOCR(file)
    }
    
    const answers = enhancedParseAnswers(text)
    console.log(`Enhanced解答抽出完了: ${Object.keys(answers).length}問`)
    
    return answers
  } catch (error: any) {
    console.error("Enhanced解答抽出エラー:", error)
    throw new Error(`Enhanced解答の抽出に失敗しました: ${error.message}`)
  }
}

export function enhancedMatchQuestionsWithAnswers(questions: ParsedQuestion[], answers: ParsedAnswers): ParsedQuestion[] {
  return questions.map((question, index) => ({
    ...question,
    correct_answer: answers[(index + 1).toString()],
  }))
}
