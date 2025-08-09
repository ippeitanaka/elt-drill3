'use client'

import { useState } from 'react'

interface ServerOCRResult {
  success: boolean
  message?: string
  results?: {
    questionsCount: number
    categoryName: string
    questionSetName: string
    ocrConfidence: number
    textQuality: {
      score: number
      issues: string[]
      recommendations: string[]
    }
  }
  analysis?: {
    textLength: number
    confidence: number
    sampleQuestions: Array<{
      text: string
      choicesCount: number
    }>
  }
  error?: string
  details?: string
}

export function ServerOCRUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState('心肺停止')
  const [datasetSize, setDatasetSize] = useState('medium')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ServerOCRResult | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const getDatasetSizeLabel = (size: string) => {
    switch (size) {
      case 'small': return '小規模（30問）'
      case 'medium': return '中規模（100問）'
      case 'large': return '大規模（500問）'
      case 'xlarge': return '超大規模（700問）'
      default: return '中規模（100問）'
    }
  }

  const getExpectedQuestions = (size: string) => {
    switch (size) {
      case 'small': return 30
      case 'medium': return 100
      case 'large': return 500
      case 'xlarge': return 700
      default: return 100
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setResult(null)
      setLogs([])
      addLog(`PDFファイル選択: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`)
    } else {
      alert('PDFファイルを選択してください')
    }
  }

  const processWithServerOCR = async () => {
    if (!file) {
      alert('PDFファイルを選択してください')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setResult(null)
    addLog('サーバーサイドOCR処理開始...')

    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('category', category)
      formData.append('questionCount', datasetSize)

      // プログレス更新
      setProgress(20)
      addLog(`${getDatasetSizeLabel(datasetSize)}のデータセットでPDFファイルをサーバーに送信中...`)

      // まず本番のサーバーOCRを試行（実際のPDFをOCR）
      let response = await fetch('/api/server-ocr-upload', {
        method: 'POST',
        body: formData
      })

      // 失敗した場合のみ、サンプルデータベースの簡易APIにフォールバック
      if (!response.ok) {
        addLog('⚠️ 本番サーバーOCRが失敗。サンプルデータAPIにフォールバックします...')
        response = await fetch('/api/simple-server-ocr', {
          method: 'POST',
          body: formData
        })
      }

      setProgress(60)
      addLog('サーバーでOCR処理実行中...')

      const data: ServerOCRResult = await response.json()
      
      setProgress(100)
      setResult(data)

      if (data.success) {
        addLog(`✅ 処理完了: ${data.results?.questionsCount}問を抽出`)
        addLog(`信頼度: ${(data.analysis?.confidence || 0).toFixed(2)}`)
        addLog(`テキスト品質: ${data.results?.textQuality.score}/100`)
      } else {
        addLog(`❌ 処理失敗: ${data.error}`)
      }

    } catch (error) {
      console.error('サーバーOCRエラー:', error)
      addLog(`❌ エラー: ${error instanceof Error ? error.message : String(error)}`)
      setResult({
        success: false,
        error: 'サーバーOCR処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="bg-blue-50 px-6 py-4 border-b">
        <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">
          🚀 サーバーサイドOCR処理
        </h2>
        <p className="text-sm text-blue-600 mt-1">
          サーバーでOCR処理を行い、直接データベースに問題を保存します。
          クライアント側の負荷が軽く、安定性が向上します。
        </p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* ファイル選択 */}
        <div className="space-y-2">
          <label htmlFor="pdf-file" className="block text-sm font-medium text-gray-700">
            PDFファイル選択
          </label>
          <input
            id="pdf-file"
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {file && (
            <div className="text-sm text-gray-600">
              選択済み: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
            </div>
          )}
        </div>

        {/* カテゴリー設定 */}
        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            カテゴリー名
          </label>
          <input
            id="category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="例: 心肺停止、外傷処置"
            disabled={isProcessing}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* データセットサイズ選択 */}
        <div className="space-y-2">
          <label htmlFor="dataset-size" className="block text-sm font-medium text-gray-700">
            データセットサイズ
          </label>
          <select
            id="dataset-size"
            value={datasetSize}
            onChange={(e) => setDatasetSize(e.target.value)}
            disabled={isProcessing}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="small">小規模 - 30問（テスト用）</option>
            <option value="medium">中規模 - 100問（標準）</option>
            <option value="large">大規模 - 500問（本格的）</option>
            <option value="xlarge">超大規模 - 700問（最大規模）</option>
          </select>
          <div className="text-sm text-gray-600">
            選択中: {getDatasetSizeLabel(datasetSize)} - 約{getExpectedQuestions(datasetSize)}問の医療問題が生成されます
          </div>
          {datasetSize === 'xlarge' && (
            <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ 超大規模モードは処理に時間がかかる場合があります（1-3分程度）
            </div>
          )}
        </div>

        {/* 処理実行ボタン */}
        <button 
          onClick={processWithServerOCR}
          disabled={!file || isProcessing}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? '処理中...' : 'サーバーOCR実行'}
        </button>

        {/* プログレス表示 */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>処理進行状況</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* ログ表示 */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">処理ログ</label>
            <textarea
              value={logs.join('\n')}
              readOnly
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md font-mono text-xs bg-gray-50"
            />
          </div>
        )}

        {/* 結果表示 */}
        {result && (
          <div className={`p-4 rounded-md border ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            {result.success ? (
              <div className="space-y-2">
                <div className="font-semibold text-green-800">✅ 処理成功</div>
                <div className="text-sm space-y-1">
                  <div>📚 抽出問題数: {result.results?.questionsCount}問</div>
                  <div>📁 カテゴリー: {result.results?.categoryName}</div>
                  <div>🎯 OCR信頼度: {(result.analysis?.confidence || 0).toFixed(2)}</div>
                  <div>📊 テキスト品質: {result.results?.textQuality.score}/100</div>
                  {result.results?.textQuality.issues.length ? (
                    <div className="mt-2">
                      <div className="font-medium">検出された問題:</div>
                      <ul className="list-disc list-inside">
                        {result.results.textQuality.issues.map((issue, idx) => (
                          <li key={idx} className="text-xs">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {result.analysis?.sampleQuestions.length ? (
                    <div className="mt-2">
                      <div className="font-medium">抽出例:</div>
                      {result.analysis.sampleQuestions.map((q, idx) => (
                        <div key={idx} className="text-xs border-l-2 border-gray-300 pl-2 ml-2">
                          {q.text}... ({q.choicesCount}選択肢)
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="font-semibold text-red-800">❌ 処理失敗</div>
                <div className="text-sm">
                  <div>エラー: {result.error}</div>
                  {result.details && <div>詳細: {result.details}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 使用方法の説明 */}
        <div className="bg-blue-50 rounded-md border border-blue-200">
          <div className="px-4 py-3 border-b border-blue-200">
            <h3 className="text-sm font-medium text-blue-800">💡 サーバーOCRの特徴</h3>
          </div>
          <div className="p-4 text-sm space-y-2">
            <div>✅ サーバーサイドで処理するため、クライアント負荷が軽い</div>
            <div>✅ ネットワークエラーの影響を受けにくい</div>
            <div>✅ より高精度なOCRエンジンを使用</div>
            <div>✅ 直接データベースに保存されるため確実</div>
            <div>⚠️ 処理時間は少し長くなる場合があります</div>
          </div>
        </div>
      </div>
    </div>
  )
}
