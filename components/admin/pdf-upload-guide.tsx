"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle, AlertTriangle, Info } from "lucide-react"

export function PDFUploadGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            PDFアップロードガイド
          </CardTitle>
          <CardDescription>効果的なPDF解析のためのガイドライン</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 推奨フォーマット */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              推奨PDFフォーマット
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h5 className="font-medium text-green-800 mb-2">問題PDF</h5>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 明確な問題番号（問1、1.、Q1など）</li>
                  <li>• 5択の選択肢（A.〜E.）</li>
                  <li>• 読みやすいフォント</li>
                  <li>• 十分なコントラスト</li>
                </ul>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-800 mb-2">解答PDF</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 問題番号と解答の対応</li>
                  <li>• 「問1: A」「1. B」形式</li>
                  <li>• 一覧表形式が理想的</li>
                  <li>• 余計な文字の少ないレイアウト</li>
                </ul>
              </div>
            </div>
          </div>

          {/* サンプルフォーマット */}
          <div className="space-y-3">
            <h4 className="font-semibold">サンプルフォーマット</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h5 className="font-medium mb-2">問題PDFの例</h5>
                <pre className="text-xs bg-gray-100 p-2 rounded whitespace-pre-wrap">
                  {`問1. 成人の心肺蘇生において、胸骨圧迫の深さはどのくらいが適切ですか？

A. 3-4cm
B. 5-6cm  
C. 7-8cm
D. 9-10cm
E. 11-12cm

問2. アドレナリンの主な作用機序は何ですか？

A. β受容体遮断
B. α・β受容体刺激
C. カルシウム拮抗
D. ACE阻害
E. 利尿作用`}
                </pre>
              </Card>
              <Card className="p-4">
                <h5 className="font-medium mb-2">解答PDFの例</h5>
                <pre className="text-xs bg-gray-100 p-2 rounded whitespace-pre-wrap">
                  {`解答一覧

問1: B
問2: B
問3: A
問4: C
問5: D

または

1. B
2. B  
3. A
4. C
5. D`}
                </pre>
              </Card>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              注意事項
            </h4>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• 手書きのPDFは認識精度が低下する可能性があります</li>
                <li>• 画像が多いPDFは処理に時間がかかります</li>
                <li>• 複雑なレイアウトは解析が困難な場合があります</li>
                <li>• 解析後は必ずプレビューで内容を確認してください</li>
                <li>• 問題が正しく認識されない場合は手動で修正できます</li>
              </ul>
            </div>
          </div>

          {/* 対応機能 */}
          <div className="space-y-3">
            <h4 className="font-semibold">対応機能</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Badge variant="outline" className="justify-center">
                <FileText className="h-3 w-3 mr-1" />
                テキストPDF
              </Badge>
              <Badge variant="outline" className="justify-center">
                <FileText className="h-3 w-3 mr-1" />
                画像PDF
              </Badge>
              <Badge variant="outline" className="justify-center">
                <FileText className="h-3 w-3 mr-1" />
                日本語OCR
              </Badge>
              <Badge variant="outline" className="justify-center">
                <FileText className="h-3 w-3 mr-1" />
                英語OCR
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
