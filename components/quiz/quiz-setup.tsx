"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Clock, Shuffle, List, Target } from "lucide-react"

interface QuizSetupProps {
  categoryName: string
  totalQuestions: number
  onStart: (config: {
    mode: "timed" | "all_questions" | "random"
    questionCount?: number
    timeLimit?: number
  }) => void
}

export function QuizSetup({ categoryName, totalQuestions, onStart }: QuizSetupProps) {
  const [mode, setMode] = useState<"timed" | "all_questions" | "random">("all_questions")
  const [questionCount, setQuestionCount] = useState(10)
  const [timeLimit, setTimeLimit] = useState(30)

  const handleStart = () => {
    onStart({
      mode,
      questionCount: mode === "random" ? questionCount : undefined,
      timeLimit: mode === "timed" ? timeLimit * 60 : undefined, // Convert to seconds
    })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            クイズ設定
          </CardTitle>
          <CardDescription>
            {categoryName} - 全{totalQuestions}問から学習方法を選択してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-medium">学習モード</Label>
            <RadioGroup value={mode} onValueChange={(value: any) => setMode(value)} className="mt-3">
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="all_questions" id="all" />
                <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer flex-1">
                  <List className="h-4 w-4" />
                  <div>
                    <div className="font-medium">全問題</div>
                    <div className="text-sm text-muted-foreground">すべての問題に挑戦</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="random" id="random" />
                <Label htmlFor="random" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Shuffle className="h-4 w-4" />
                  <div>
                    <div className="font-medium">ランダム</div>
                    <div className="text-sm text-muted-foreground">指定した数の問題をランダムに出題</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="timed" id="timed" />
                <Label htmlFor="timed" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Clock className="h-4 w-4" />
                  <div>
                    <div className="font-medium">時間制限</div>
                    <div className="text-sm text-muted-foreground">制限時間内で挑戦</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {mode === "random" && (
            <>
              <Separator />
              <div>
                <Label htmlFor="questionCount" className="text-base font-medium">
                  問題数
                </Label>
                <Input
                  id="questionCount"
                  type="number"
                  min={1}
                  max={totalQuestions}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number.parseInt(e.target.value) || 1)}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">1〜{totalQuestions}問の範囲で設定してください</p>
              </div>
            </>
          )}

          {mode === "timed" && (
            <>
              <Separator />
              <div>
                <Label htmlFor="timeLimit" className="text-base font-medium">
                  制限時間（分）
                </Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min={5}
                  max={120}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number.parseInt(e.target.value) || 5)}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">5〜120分の範囲で設定してください</p>
              </div>
            </>
          )}

          <Separator />

          <Button onClick={handleStart} className="w-full" size="lg">
            クイズを開始
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
