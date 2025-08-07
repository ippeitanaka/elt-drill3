"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Brain, Upload, Settings, Users, Database, BarChart, Sparkles, Plus, Edit, Wifi } from 'lucide-react'
import { getSupabaseClient, createServerClient } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { PDFUploadNew } from '@/components/admin/pdf-upload-new'
import SimpleCategoryManager from '@/components/admin/simple-category-manager'
import { SupabaseConnectionTest } from '@/components/admin/supabase-connection-test'
import { DatabaseSchemaCheck } from '@/components/admin/database-schema-check'
import type { Category } from '@/lib/types'

// インライン医療OCRコンポーネント
function MedicalOCRInline({ categories, onClose }: { categories: Category[], onClose: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [autoDetectCategory, setAutoDetectCategory] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
      setResult(null)
    } else {
      alert('PDFファイルを選択してください')
    }
  }

  const processPDF = async () => {
    if (!selectedFile) {
      alert('PDFファイルを選択してください')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResult(null)

    try {
      // プログレス更新のシミュレーション
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const formData = new FormData()
      formData.append('pdfFile', selectedFile)
      if (selectedCategory && !autoDetectCategory) {
        formData.append('categoryId', selectedCategory)
      }
      formData.append('autoDetectCategory', autoDetectCategory.toString())

      console.log('🚀 医療問題OCR処理開始...')
      
      const response = await fetch('/api/process-medical-pdf', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data = await response.json()
      setResult(data)

      if (data.success) {
        console.log('✅ 医療問題OCR処理完了:', data)
        toast({
          title: "処理完了",
          description: `${data.data.totalSaved}問の医療問題を正常に抽出・保存しました`,
        })
      } else {
        console.error('❌ 医療問題OCR処理失敗:', data.error)
        toast({
          title: "処理失敗",
          description: data.error || '処理中にエラーが発生しました',
          variant: "destructive",
        })
      }

    } catch (error: any) {
      console.error('❌ 医療問題OCR処理例外:', error)
      setResult({
        success: false,
        error: error.message || '処理中にエラーが発生しました'
      })
      setProgress(100)
      toast({
        title: "処理エラー",
        description: error.message || '処理中にエラーが発生しました',
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 mb-4">
        PDFファイルから医療系問題を自動抽出してデータベースに保存します。医療専門用語に対応した高精度OCRを使用します。
      </div>
      
      {/* ファイル選択 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">PDFファイル選択</label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          disabled={isProcessing}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {selectedFile && (
          <p className="text-sm text-gray-600">
            選択されたファイル: {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
          </p>
        )}
      </div>

      {/* カテゴリー設定 */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoDetect"
            checked={autoDetectCategory}
            onChange={(e) => setAutoDetectCategory(e.target.checked)}
            disabled={isProcessing}
            className="rounded border-gray-300"
          />
          <label htmlFor="autoDetect" className="text-sm font-medium">
            カテゴリーを自動判定する（推奨）
          </label>
        </div>
        
        {!autoDetectCategory && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">手動カテゴリー選択</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={isProcessing}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">カテゴリーを選択...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 処理実行ボタン */}
      <Button
        onClick={processPDF}
        disabled={!selectedFile || isProcessing}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        {isProcessing ? '医療問題を抽出中...' : '医療問題を抽出'}
      </Button>

      {/* プログレスバー */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-gray-600">
            PDFを解析中... {progress}%
          </p>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="space-y-4">
          {result.success ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{result.message}</p>
                  {result.data && (
                    <div className="mt-2 text-sm text-green-700 space-y-1">
                      <p>• 抽出された問題数: {result.data.totalExtracted}問</p>
                      <p>• 保存された問題数: {result.data.totalSaved}問</p>
                      <p>• 問題セットID: {result.data.questionSetId}</p>
                      <p>• カテゴリーID: {result.data.categoryId}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Upload className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">エラー: {result.error}</p>
                  {result.recommendations && (
                    <div className="mt-2 text-sm text-red-700">
                      <p className="font-semibold">推奨対策:</p>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {result.recommendations.map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 抽出されたテキストの表示（成功・失敗問わず） */}
          {result.extractedText && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">抽出されたテキスト（先頭1000文字）:</label>
              <textarea
                className="w-full h-32 p-3 border border-gray-300 rounded-md text-xs font-mono bg-gray-50"
                value={result.extractedText}
                readOnly
              />
              {result.textLength && (
                <p className="text-xs text-gray-600">
                  全体のテキスト長: {result.textLength.toLocaleString()}文字
                </p>
              )}
            </div>
          )}

          {/* 抽出された問題の詳細（成功時のみ） */}
          {result.success && result.data?.questions && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">抽出された問題一覧:</label>
              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                {result.data.questions.map((question: any, index: number) => (
                  <div key={index} className="p-3 border-b last:border-b-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm">問題 {question.number}</span>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          選択肢: {question.choicesCount}個
                        </span>
                        {question.hasCorrectAnswer && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                            正解あり
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{question.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.success && (
            <div className="flex gap-4">
              <Button
                onClick={onClose}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                ✅ 完了して閉じる
              </Button>
              <Button
                onClick={() => {
                  setSelectedFile(null)
                  setResult(null)
                  setProgress(0)
                }}
                variant="outline"
                className="flex-1"
              >
                🔄 新しいファイルを処理
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 問題+解答セット処理コンポーネント
function QuestionAnswerSetProcessor({ categories, onClose }: { categories: Category[], onClose: () => void }) {
  const [questionFile, setQuestionFile] = useState<File | null>(null)
  const [answerFile, setAnswerFile] = useState<File | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [autoDetectCategory, setAutoDetectCategory] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [progress, setProgress] = useState(0)

  const handleQuestionFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setQuestionFile(file)
      setResult(null)
    } else {
      alert('問題PDFファイルを選択してください')
    }
  }

  const handleAnswerFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setAnswerFile(file)
      setResult(null)
    } else {
      alert('解答PDFファイルを選択してください')
    }
  }

  const processFiles = async () => {
    if (!questionFile || !answerFile) {
      alert('問題PDFと解答PDFの両方を選択してください')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResult(null)

    try {
      // プログレス更新のシミュレーション
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 5
        })
      }, 800)

      const formData = new FormData()
      formData.append('questionFile', questionFile)
      formData.append('answerFile', answerFile)
      if (selectedCategory && !autoDetectCategory) {
        formData.append('categoryId', selectedCategory)
      }
      formData.append('autoDetectCategory', autoDetectCategory.toString())

      console.log('🚀 問題+解答セット処理開始...')
      
      const response = await fetch('/api/process-question-answer-set', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data = await response.json()
      setResult(data)

      if (data.success) {
        console.log('✅ 問題+解答セット処理完了:', data)
        toast({
          title: "処理完了",
          description: `${data.data.totalSaved}問の医療問題（${data.data.questionsWithAnswers}問に正解あり）を正常に抽出・保存しました`,
        })
      } else {
        console.error('❌ 問題+解答セット処理失敗:', data.error)
        toast({
          title: "処理失敗",
          description: data.error || '処理中にエラーが発生しました',
          variant: "destructive",
        })
      }

    } catch (error: any) {
      console.error('❌ 問題+解答セット処理例外:', error)
      setResult({
        success: false,
        error: error.message || '処理中にエラーが発生しました'
      })
      setProgress(100)
      toast({
        title: "処理エラー",
        description: error.message || '処理中にエラーが発生しました',
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 mb-4">
        問題PDFと解答PDFの両方を処理して、正解付きの医療問題をデータベースに保存します。
        救急救命士国家試験などの分離された問題・解答形式に対応しています。
      </div>
      
      {/* ファイル選択 */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">問題PDFファイル</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleQuestionFileChange}
            disabled={isProcessing}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {questionFile && (
            <p className="text-sm text-gray-600">
              📝 {questionFile.name} ({Math.round(questionFile.size / 1024)}KB)
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">解答PDFファイル</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleAnswerFileChange}
            disabled={isProcessing}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          {answerFile && (
            <p className="text-sm text-gray-600">
              ✅ {answerFile.name} ({Math.round(answerFile.size / 1024)}KB)
            </p>
          )}
        </div>
      </div>

      {/* カテゴリー設定 */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoDetectCategory"
            checked={autoDetectCategory}
            onChange={(e) => setAutoDetectCategory(e.target.checked)}
            disabled={isProcessing}
            className="rounded border-gray-300"
          />
          <label htmlFor="autoDetectCategory" className="text-sm font-medium">
            カテゴリーを自動判定する（推奨）
          </label>
        </div>
        
        {!autoDetectCategory && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">手動カテゴリー選択</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={isProcessing}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">カテゴリーを選択...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 処理実行ボタン */}
      <Button
        onClick={processFiles}
        disabled={!questionFile || !answerFile || isProcessing}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        {isProcessing ? '問題+解答セットを処理中...' : '問題+解答セットを処理'}
      </Button>

      {/* プログレスバー */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-gray-600">
            問題と解答を処理中... {progress}%
          </p>
        </div>
      )}

      {/* 結果表示 */}
      {result && (
        <div className="space-y-4">
          {result.success ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Plus className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{result.message}</p>
                  {result.data && (
                    <div className="mt-2 text-sm text-green-700 space-y-1">
                      <p>• 抽出された問題数: {result.data.totalExtractedQuestions}問</p>
                      <p>• 抽出された解答数: {result.data.totalExtractedAnswers}問</p>
                      <p>• 正解付き問題数: {result.data.questionsWithAnswers}問</p>
                      <p>• 保存された問題数: {result.data.totalSaved}問</p>
                      <p>• 問題セットID: {result.data.questionSetId}</p>
                      <p>• カテゴリーID: {result.data.categoryId}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Upload className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">エラー: {result.error}</p>
                  {result.recommendations && (
                    <div className="mt-2 text-sm text-red-700">
                      <p className="font-semibold">推奨対策:</p>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {result.recommendations.map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 抽出されたテキストの表示（成功・失敗問わず） */}
          {result.extractedTexts && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">問題PDFテキスト（先頭500文字）:</label>
                <textarea
                  className="w-full h-24 p-3 border border-gray-300 rounded-md text-xs font-mono bg-gray-50"
                  value={result.extractedTexts.question}
                  readOnly
                />
                {result.textLengths?.question && (
                  <p className="text-xs text-gray-600">
                    問題PDFテキスト長: {result.textLengths.question.toLocaleString()}文字
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">解答PDFテキスト（先頭500文字）:</label>
                <textarea
                  className="w-full h-24 p-3 border border-gray-300 rounded-md text-xs font-mono bg-gray-50"
                  value={result.extractedTexts.answer}
                  readOnly
                />
                {result.textLengths?.answer && (
                  <p className="text-xs text-gray-600">
                    解答PDFテキスト長: {result.textLengths.answer.toLocaleString()}文字
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 抽出された問題の詳細（成功時のみ） */}
          {result.success && result.data?.questions && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">抽出された問題一覧:</label>
              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
                {result.data.questions.map((question: any, index: number) => (
                  <div key={index} className="p-3 border-b last:border-b-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm">問題 {question.number}</span>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          選択肢: {question.choicesCount}個
                        </span>
                        {question.hasCorrectAnswer ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                            正解: {question.correctAnswer}
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                            正解なし
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{question.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.success && (
            <div className="flex gap-4">
              <Button
                onClick={onClose}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                ✅ 完了して閉じる
              </Button>
              <Button
                onClick={() => {
                  setQuestionFile(null)
                  setAnswerFile(null)
                  setResult(null)
                  setProgress(0)
                }}
                variant="outline"
                className="flex-1"
              >
                🔄 新しいファイルセットを処理
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const supabase = getSupabaseClient()
  const [categories, setCategories] = useState<Category[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [showConnectionTest, setShowConnectionTest] = useState(false)
  const [showSchemaCheck, setShowSchemaCheck] = useState(false)
  const [showMedicalOCR, setShowMedicalOCR] = useState(false)
  const [showQuestionAnswerSet, setShowQuestionAnswerSet] = useState(false)
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalUsers: 0,
    totalQuizzes: 0,
    categoriesCount: 0
  })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login' // 未認証の場合はログインページへリダイレクト
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        window.location.href = '/' // 管理者でない場合はホームページへリダイレクト
      }
    }

    // 認証チェックを一時的に無効化（開発用）
    // checkAuth()
  }, [supabase])

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      console.log('🔄 管理画面でカテゴリー取得開始')
      
      // APIからカテゴリーを取得
      const response = await fetch('/api/debug-categories')
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      const categoryResult = await response.json()
      console.log('📊 カテゴリーAPI結果:', categoryResult)
      
      if (!categoryResult.success) {
        throw new Error(categoryResult.error || 'カテゴリー取得に失敗しました')
      }
      
      const categoriesData = categoryResult.data || []
      console.log('📊 生データ確認:', categoriesData)

      const formattedCategories: Category[] = categoriesData.map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        icon: String(item.icon || '📚'), // デフォルトアイコン
        color: String(item.color || 'red'), // デフォルト色
        description: String(item.description || `${item.name}に関する問題`), // デフォルト説明
        total_questions: Number(item.total_questions || 0), // デフォルト0
        created_at: String(item.created_at),
        updated_at: String(item.updated_at || item.created_at), // created_atをフォールバック
      }))

      console.log('📋 フォーマット後:', formattedCategories)

      setCategories(formattedCategories)
      console.log('✅ 管理画面: カテゴリー取得完了', {
        count: formattedCategories.length,
        categories: formattedCategories
      })

      // 統計情報を取得
      try {
        const statsResponse = await fetch('/api/debug-table-structure')
        const statsResult = await statsResponse.json()
        
        if (statsResult.success) {
          setStats({
            totalQuestions: statsResult.data.questionsCount || 0,
            totalUsers: 0, // profilesテーブルが存在しないため0
            totalQuizzes: statsResult.data.questionSets?.length || 0,
            categoriesCount: formattedCategories.length
          })
        }
      } catch (statsError) {
        console.warn('統計情報の取得に失敗:', statsError)
        setStats({
          totalQuestions: 0,
          totalUsers: 0,
          totalQuizzes: 0,
          categoriesCount: formattedCategories.length
        })
      }

    } catch (error: any) {
      console.error('管理データ読み込みエラー:', error)
      toast({
        title: "データ読み込みエラー",
        description: "管理データの読み込みに失敗しました。",
        variant: "destructive",
      })
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-red-50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-red-600 hover:text-red-800 mb-4 inline-block">
            ← ホームに戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🔧 管理画面</h1>
          <p className="text-xl text-gray-600">救急救命士国家試験問題の管理と設定</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                PDF問題アップロード
              </CardTitle>
              <CardDescription>
                カテゴリー別に国家試験問題PDFと解答PDFをアップロード
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                カテゴリーを選択してPDFファイルをアップロードし、自動的に問題を抽出します
              </p>
              <Button 
                onClick={() => {
                  console.log('🚀 PDFアップロード画面を開きます', {
                    categoriesCount: categories.length,
                    categories: categories.map(c => ({ id: c.id, name: c.name }))
                  })
                  setShowUpload(true)
                }}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                PDFアップロードを開く
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                カテゴリー管理
              </CardTitle>
              <CardDescription>
                学習分野（基礎医学、救急医学等）の追加・編集・削除
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                問題のカテゴリーを管理し、整理する
              </p>
              <Button 
                onClick={() => setShowCategoryManager(true)}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                カテゴリー管理を開く
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                データベース接続
              </CardTitle>
              <CardDescription>
                Supabase接続状況の確認
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                データベースとの接続状況をテスト
              </p>
              <Button 
                onClick={() => setShowConnectionTest(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Database className="h-4 w-4 mr-2" />
                接続テストを開く
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                データベース構造
              </CardTitle>
              <CardDescription>
                テーブル構造とデータの確認
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                既存のテーブル構造とサンプルデータを確認
              </p>
              <Button 
                onClick={() => setShowSchemaCheck(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Database className="h-4 w-4 mr-2" />
                スキーマをチェック
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                医療問題OCR抽出
              </CardTitle>
              <CardDescription>
                PDFから医療問題を自動抽出・保存
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                医療専門用語対応の高精度OCRで実際の問題を抽出
              </p>
              <Button 
                onClick={() => setShowMedicalOCR(true)}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                医療OCRを開く
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <Upload className="h-5 w-5" />
                問題+解答セット処理
              </CardTitle>
              <CardDescription>
                問題PDFと解答PDFを同時処理
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                問題PDFと解答PDFの両方を処理して正解付きの問題を生成
              </p>
              <Button 
                onClick={() => setShowQuestionAnswerSet(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                問題+解答セットを開く
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>システム情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.totalQuestions}</p>
                <p className="text-sm text-gray-600">登録問題数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.totalUsers}</p>
                <p className="text-sm text-gray-600">学習者数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.totalQuizzes}</p>
                <p className="text-sm text-gray-600">総受験回数</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.categoriesCount}</p>
                <p className="text-sm text-gray-600">カテゴリー数</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* モーダルコンポーネント */}
      {showUpload && (
        <PDFUploadNew
          categories={categories}
          onClose={() => {
            console.log('🔒 PDFアップロード画面を閉じます')
            setShowUpload(false)
          }}
          onSuccess={() => {
            console.log('✅ PDFアップロード成功')
            setShowUpload(false)
            loadAdminData()
          }}
        />
      )}

      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">カテゴリー管理</h2>
              <Button
                variant="outline"
                onClick={() => setShowCategoryManager(false)}
              >
                閉じる
              </Button>
            </div>
            <div className="p-4">
              <SimpleCategoryManager />
            </div>
          </div>
        </div>
      )}

      {showConnectionTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">データベース接続テスト</h2>
              <Button
                variant="outline"
                onClick={() => setShowConnectionTest(false)}
              >
                閉じる
              </Button>
            </div>
            <div className="p-4">
              <SupabaseConnectionTest />
            </div>
          </div>
        </div>
      )}

      {showSchemaCheck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">データベース構造チェック</h2>
              <Button
                variant="outline"
                onClick={() => setShowSchemaCheck(false)}
              >
                閉じる
              </Button>
            </div>
            <div className="p-4">
              <DatabaseSchemaCheck />
            </div>
          </div>
        </div>
      )}

      {showMedicalOCR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">医療問題OCR抽出システム</h2>
              <Button
                variant="outline"
                onClick={() => setShowMedicalOCR(false)}
              >
                閉じる
              </Button>
            </div>
            <div className="p-6">
              <MedicalOCRInline categories={categories} onClose={() => {
                setShowMedicalOCR(false)
                loadAdminData() // データを再読み込み
              }} />
            </div>
          </div>
        </div>
      )}

      {showQuestionAnswerSet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">問題+解答セット処理システム</h2>
              <Button
                variant="outline"
                onClick={() => setShowQuestionAnswerSet(false)}
              >
                閉じる
              </Button>
            </div>
            <div className="p-6">
              <QuestionAnswerSetProcessor categories={categories} onClose={() => {
                setShowQuestionAnswerSet(false)
                loadAdminData() // データを再読み込み
              }} />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
