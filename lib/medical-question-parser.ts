// 医療系問題専用パーサー
export interface MedicalQuestion {
  questionNumber: number
  questionText: string
  choices: { [key: string]: string }
  correctAnswer?: string
  explanation?: string
  category?: string
}

export interface MedicalQuizSet {
  questions: MedicalQuestion[]
  totalQuestions: number
  extractedAt: string
  source: string
}

// 医療系問題の特徴的パターン
const MEDICAL_QUESTION_PATTERNS = [
  // 「問1」「問題1」「1.」形式
  /(?:問題?|Question|Q)\s*(\d+)\s*[．.\)）:：]?\s*(.+?)(?=(?:問題?|Question|Q)\s*\d+|(?=\n\s*[1-5ア-オa-eA-E]\s*[．.\)）])|$)/gims,
  
  // 医療特有の問題文パターン
  /(\d+)\s*[．.\)）]\s*(.+?(?:患者|症例|病態|治療|診断|症状|薬物|投与|処置|手術|検査|感染|疾患|病原体|臨床|医療).+?)(?=\n\s*\d+\s*[．.\)）]|(?=\n\s*[1-5ア-オa-eA-E]\s*[．.\)）])|$)/gims,
  
  // 症例問題パターン
  /(\d+)\s*[．.\)）]\s*(.+?(?:歳|才)(?:の|、)(?:男性|女性|患者).+?)(?=\n\s*\d+\s*[．.\)）]|(?=\n\s*[1-5ア-オa-eA-E]\s*[．.\)）])|$)/gims,
  
  // 「次のうち」「以下のうち」パターン（医療向け）
  /(\d+)\s*[．.\)）]\s*(.+?(?:次のうち|以下のうち|下記のうち).+?(?:正しい|適切な|間違っている|誤っている|最も|もっとも).+?)(?=\n\s*\d+\s*[．.\)）]|(?=\n\s*[1-5ア-オa-eA-E]\s*[．.\)）])|$)/gims
]

const MEDICAL_CHOICE_PATTERNS = [
  // 基本選択肢パターン（1. 2. 3. 4. 5.）
  /^\s*([1-5])\s*[．.\)）]\s*(.+?)$/gm,
  
  // アルファベット選択肢（a. b. c. d. e.）
  /^\s*([a-eA-E])\s*[．.\)）]\s*(.+?)$/gm,
  
  // ひらがな選択肢（ア. イ. ウ. エ. オ.）
  /^\s*([ア-オ])\s*[．.\)）]\s*(.+?)$/gm,
  
  // 括弧付き選択肢 (1) (2) (3) (4) (5)
  /^\s*\(([1-5a-eA-Eア-オ])\)\s*(.+?)$/gm,
  
  // 医療専門用語を含む選択肢
  /^\s*([1-5a-eA-Eア-オ])\s*[．.\)）:：]\s*(.+?(?:mg|ml|μg|kg|mmHg|bpm|℃|％|時間|分|秒|回|錠|カプセル|注射|点滴|手術|検査|診断|治療|症状|疾患|薬剤).+?)$/gm
]

const MEDICAL_ANSWER_PATTERNS = [
  // 「答え：1」「解答：1」
  /(?:答え|解答|正解|Answer)[:：]\s*([1-5a-eA-Eア-オ])/gi,
  
  // 「正解は1」
  /(?:正解|正答|答え)\s*(?:は|が)?\s*([1-5a-eA-Eア-オ])/gi,
  
  // 「1が正解」
  /([1-5a-eA-Eア-オ])\s*(?:番|が|は)?\s*(?:正解|正答|答え)/gi
]

// テキストから医療問題を抽出
export function parseMedicalQuestions(text: string): MedicalQuizSet {
  console.log('🏥 医療問題解析開始...')
  console.log(`📝 入力テキスト長: ${text.length}文字`)
  
  const questions: MedicalQuestion[] = []
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  console.log(`📄 処理対象行数: ${lines.length}行`)
  
  let currentQuestion: Partial<MedicalQuestion> | null = null
  let isCollectingChoices = false
  let pendingQuestionNumber: number | null = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 問題番号と問題文を検出
    const questionMatch = detectQuestionStart(line)
    if (questionMatch) {
      // 前の問題を保存
      if (currentQuestion && currentQuestion.questionText) {
        questions.push(currentQuestion as MedicalQuestion)
      }
      
      // 問題文が空の場合（数字のみの行）、次の行を問題文として使用
      if (questionMatch.text === '' && i + 1 < lines.length) {
        pendingQuestionNumber = questionMatch.number
        continue
      }
      
      console.log(`📋 問題${questionMatch.number}を検出: ${questionMatch.text.substring(0, 50)}...`)
      
      currentQuestion = {
        questionNumber: questionMatch.number,
        questionText: questionMatch.text,
        choices: {}
      }
      isCollectingChoices = true
      pendingQuestionNumber = null
      continue
    }
    
    // 保留中の問題番号がある場合、この行を問題文とする
    if (pendingQuestionNumber !== null && line.length > 10) {
      console.log(`📋 問題${pendingQuestionNumber}を検出（分離形式）: ${line.substring(0, 50)}...`)
      
      currentQuestion = {
        questionNumber: pendingQuestionNumber,
        questionText: line,
        choices: {}
      }
      isCollectingChoices = true
      pendingQuestionNumber = null
      continue
    }
    
    // 選択肢を検出
    if (isCollectingChoices && currentQuestion) {
      const choiceMatch = detectChoice(line)
      if (choiceMatch) {
        currentQuestion.choices![choiceMatch.key] = choiceMatch.text
        console.log(`  ✓ 選択肢${choiceMatch.key}: ${choiceMatch.text.substring(0, 30)}...`)
        continue
      }
      
      // 答えを検出
      const answerMatch = detectAnswer(line)
      if (answerMatch) {
        currentQuestion.correctAnswer = answerMatch
        console.log(`  🎯 正解: ${answerMatch}`)
        continue
      }
      
      // 複数行にわたる問題文や選択肢を処理
      if (line.length > 5 && !line.match(/^\d+\s*[．.\)）]/)) {
        if (Object.keys(currentQuestion.choices!).length === 0) {
          // まだ選択肢がない場合は問題文に追加
          currentQuestion.questionText += ' ' + line
        } else if (Object.keys(currentQuestion.choices!).length < 5) {
          // 選択肢が不完全な場合は最後の選択肢に追加
          const lastKey = Object.keys(currentQuestion.choices!).pop()
          if (lastKey) {
            currentQuestion.choices![lastKey] += ' ' + line
          }
        }
      }
    }
  }
  
  // 最後の問題を保存
  if (currentQuestion && currentQuestion.questionText) {
    questions.push(currentQuestion as MedicalQuestion)
  }
  
  console.log(`✅ 解析完了: ${questions.length}問を抽出`)
  
  // デバッグ情報を出力
  if (questions.length === 0) {
    console.log('⚠️ 問題が検出されませんでした。テキストサンプル:')
    console.log(lines.slice(0, 10).join('\n'))
  }
  
  return {
    questions,
    totalQuestions: questions.length,
    extractedAt: new Date().toISOString(),
    source: 'medical-question-parser'
  }
}

function detectQuestionStart(line: string): { number: number, text: string } | null {
  // パターン1: 「問1」「問題1」「Q1」
  const match1 = line.match(/^(?:問題?|Question|Q)\s*(\d+)\s*[．.\)）:：]?\s*(.+)$/i)
  if (match1) {
    return { number: parseInt(match1[1]), text: match1[2].trim() }
  }
  
  // パターン2: 「1.」「1)」（文字数制限を緩和）
  const match2 = line.match(/^(\d+)\s*[．.\)）]\s*(.+)$/)
  if (match2 && match2[2].length > 10) { // 問題文は10文字以上（緩和）
    return { number: parseInt(match2[1]), text: match2[2].trim() }
  }
  
  // パターン3: 「第1問」「1問目」形式
  const match3 = line.match(/^(?:第)?(\d+)(?:問目?|番目?)\s*[．.\)）:：]?\s*(.+)$/i)
  if (match3) {
    return { number: parseInt(match3[1]), text: match3[2].trim() }
  }
  
  // パターン4: 「No.1」「#1」形式
  const match4 = line.match(/^(?:No\.?|#)\s*(\d+)\s*[．.\)）:：]?\s*(.+)$/i)
  if (match4) {
    return { number: parseInt(match4[1]), text: match4[2].trim() }
  }
  
  // パターン5: 数字のみの行（次の行が問題文の可能性）
  const match5 = line.match(/^(\d+)\s*$/)
  if (match5) {
    return { number: parseInt(match5[1]), text: '' }
  }
  
  return null
}

function detectChoice(line: string): { key: string, text: string } | null {
  // 数字選択肢（1. 2. 3. 4. 5.）
  const match1 = line.match(/^([1-5])\s*[．.\)）]\s*(.+)$/)
  if (match1) {
    return { key: match1[1], text: match1[2].trim() }
  }
  
  // アルファベット選択肢（a. b. c. d. e.）
  const match2 = line.match(/^([a-eA-E])\s*[．.\)）]\s*(.+)$/)
  if (match2) {
    return { key: match2[1].toLowerCase(), text: match2[2].trim() }
  }
  
  // ひらがな選択肢（ア. イ. ウ. エ. オ.）
  const match3 = line.match(/^([ア-オ])\s*[．.\)）]\s*(.+)$/)
  if (match3) {
    const hiraganaMap: { [key: string]: string } = {
      'ア': '1', 'イ': '2', 'ウ': '3', 'エ': '4', 'オ': '5'
    }
    return { key: hiraganaMap[match3[1]] || match3[1], text: match3[2].trim() }
  }
  
  // 括弧付き選択肢 (1) (2) (3) (4) (5)
  const match4 = line.match(/^\(([1-5a-eA-Eア-オ])\)\s*(.+)$/)
  if (match4) {
    return { key: match4[1], text: match4[2].trim() }
  }
  
  // より柔軟な選択肢パターン（スペースなし）
  const match5 = line.match(/^([1-5a-eA-Eア-オ])[:：.](.+)$/)
  if (match5) {
    return { key: match5[1], text: match5[2].trim() }
  }
  
  // インデントされた選択肢
  const match6 = line.match(/^\s+([1-5a-eA-Eア-オ])\s*[．.\)）]\s*(.+)$/)
  if (match6) {
    return { key: match6[1], text: match6[2].trim() }
  }
  
  return null
}

function detectAnswer(line: string): string | null {
  for (const pattern of MEDICAL_ANSWER_PATTERNS) {
    const match = line.match(pattern)
    if (match) {
      return match[1].toLowerCase()
    }
  }
  return null
}

// 医療カテゴリーを自動判定
export function detectMedicalCategory(questionText: string): string {
  const categories = {
    '心肺蘇生法': ['心肺蘇生', 'CPR', 'AED', '心停止', '蘇生'],
    '薬理学': ['薬物', '薬剤', '投与', 'mg', 'ml', '副作用', '薬理'],
    '外傷処置': ['外傷', '創傷', '止血', '包帯', '骨折', '脱臼'],
    '呼吸器疾患': ['呼吸', '肺', '気管', '喘息', '肺炎', '呼吸困難'],
    '循環器疾患': ['心臓', '血圧', '循環', '心電図', '心筋梗塞', '不整脈'],
    '法規・制度': ['法律', '制度', '規則', '救急法', '医療法', '責任'],
    '心肺停止': ['心肺停止', '心停止', '呼吸停止', 'CPA']
  }
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => questionText.includes(keyword))) {
      return category
    }
  }
  
  return '心肺蘇生法' // デフォルト
}

// 解答PDF専用パーサー
export interface AnswerSet {
  answers: { [questionNumber: number]: string }
  totalAnswers: number
  extractedAt: string
  source: string
}

// 解答PDFのパターン
const ANSWER_EXTRACTION_PATTERNS = [
  // 「問1 答え：1」「問題1 解答：a」形式
  /(?:問題?|Question|Q)\s*(\d+)[\s\.:：]*(?:答え|解答|正解|Answer)[\s\.:：]*([1-5a-eA-Eア-オ①-⑤])/gi,
  
  // 「1. 1」「1: a」「1 → 2」形式（問題番号と答えが近い）
  /^(\d+)[\s\.:：\)）→]*([1-5a-eA-Eア-オ①-⑤])\s*$/gm,
  
  // 表形式「1 | a」「問1 | 2」
  /(?:問題?|Question|Q)?\s*(\d+)\s*[|\│]\s*([1-5a-eA-Eア-オ①-⑤])/gi,
  
  // 縦並び「1\na\n2\nb」形式
  /(\d+)\s*\n\s*([1-5a-eA-Eア-オ①-⑤])/g,
  
  // スペース区切り「1 a 2 b 3 c」形式
  /(\d+)\s+([1-5a-eA-Eア-オ①-⑤])(?:\s+|$)/g,
  
  // 括弧形式「(1) a」「【1】 2」
  /[\(（【](\d+)[\)）】]\s*([1-5a-eA-Eア-オ①-⑤])/g,
  
  // タブ区切り「1\ta」
  /(\d+)\t+([1-5a-eA-Eア-オ①-⑤])/g,
  
  // ドット区切り「1...a」「1．．．2」
  /(\d+)[．.]{2,}([1-5a-eA-Eア-オ①-⑤])/g
]

// 解答PDFからテキストを解析
export function parseAnswerPDF(text: string): AnswerSet {
  console.log('📋 解答PDF解析開始...')
  console.log(`📝 入力テキスト長: ${text.length}文字`)
  
  const answers: { [questionNumber: number]: string } = {}
  
  // 各パターンで解答を抽出
  for (const pattern of ANSWER_EXTRACTION_PATTERNS) {
    console.log(`🔍 パターン適用: ${pattern.source}`)
    
    let match
    while ((match = pattern.exec(text)) !== null) {
      const questionNum = parseInt(match[1])
      const answer = normalizeAnswer(match[2])
      
      if (questionNum > 0 && questionNum <= 200 && answer) { // 妥当な範囲の問題番号
        answers[questionNum] = answer
        console.log(`  ✅ 問題${questionNum}: ${answer}`)
      }
    }
    
    // グローバル正規表現のlastIndexをリセット
    pattern.lastIndex = 0
  }
  
  // 連続する数字と文字のペアを探す（フォールバック）
  if (Object.keys(answers).length === 0) {
    console.log('🔄 フォールバック: 連続パターン検索...')
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i]
      const nextLine = lines[i + 1]
      
      // 現在の行が数字で、次の行が選択肢の場合
      const numMatch = currentLine.match(/^(\d+)\.?$/)
      const ansMatch = nextLine.match(/^([1-5a-eA-Eア-オ①-⑤])\.?$/)
      
      if (numMatch && ansMatch) {
        const questionNum = parseInt(numMatch[1])
        const answer = normalizeAnswer(ansMatch[1])
        
        if (questionNum > 0 && questionNum <= 200 && answer) {
          answers[questionNum] = answer
          console.log(`  ✅ 連続パターン 問題${questionNum}: ${answer}`)
        }
      }
    }
  }
  
  console.log(`✅ 解答PDF解析完了: ${Object.keys(answers).length}問の解答を抽出`)
  
  return {
    answers,
    totalAnswers: Object.keys(answers).length,
    extractedAt: new Date().toISOString(),
    source: 'answer-pdf-parser'
  }
}

// 解答を正規化（1, a, ア → 統一形式）
function normalizeAnswer(answer: string): string {
  const normalized = answer.trim().toLowerCase()
  
  // ひらがな → 数字変換
  const hiraganaMap: { [key: string]: string } = {
    'ア': '1', 'イ': '2', 'ウ': '3', 'エ': '4', 'オ': '5',
    'あ': '1', 'い': '2', 'う': '3', 'え': '4', 'お': '5',
    'ｱ': '1', 'ｲ': '2', 'ｳ': '3', 'ｴ': '4', 'ｵ': '5'
  }
  
  // 丸数字 → 数字変換
  const circleMap: { [key: string]: string } = {
    '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5',
    '㉑': '1', '㉒': '2', '㉓': '3', '㉔': '4', '㉕': '5'
  }
  
  // 大文字アルファベット → 小文字変換
  const upperCaseMap: { [key: string]: string } = {
    'A': 'a', 'B': 'b', 'C': 'c', 'D': 'd', 'E': 'e'
  }
  
  // 全角数字 → 半角数字変換
  const fullWidthMap: { [key: string]: string } = {
    '１': '1', '２': '2', '３': '3', '４': '4', '５': '5'
  }
  
  return hiraganaMap[answer] || 
         circleMap[answer] || 
         upperCaseMap[answer] || 
         fullWidthMap[answer] || 
         normalized
}

// 問題と解答を結合
export function combineQuestionsAndAnswers(
  questionSet: MedicalQuizSet, 
  answerSet: AnswerSet
): MedicalQuizSet {
  console.log('🔗 問題と解答を結合中...')
  
  const combinedQuestions = questionSet.questions.map(question => {
    const questionNum = question.questionNumber
    const correctAnswer = answerSet.answers[questionNum]
    
    if (correctAnswer) {
      console.log(`  ✅ 問題${questionNum}: 正解 ${correctAnswer}を設定`)
      return {
        ...question,
        correctAnswer
      }
    } else {
      console.log(`  ⚠️ 問題${questionNum}: 正解が見つかりません`)
      return question
    }
  })
  
  const questionsWithAnswers = combinedQuestions.filter(q => q.correctAnswer).length
  console.log(`✅ 結合完了: ${questionsWithAnswers}/${questionSet.questions.length}問に正解を設定`)
  
  return {
    ...questionSet,
    questions: combinedQuestions
  }
}
