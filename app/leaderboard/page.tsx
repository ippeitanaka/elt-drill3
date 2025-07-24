import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LeaderboardPage() {
  // サンプルデータ
  const leaderboardData = [
    { rank: 1, name: "田中太郎", score: 950, category: "Reading" },
    { rank: 2, name: "佐藤花子", score: 920, category: "Grammar" },
    { rank: 3, name: "山田次郎", score: 890, category: "Listening" },
    { rank: 4, name: "鈴木美咲", score: 860, category: "Reading" },
    { rank: 5, name: "高橋健太", score: 840, category: "Grammar" },
  ]

  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← ホームに戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🏆 リーダーボード</h1>
          <p className="text-xl text-gray-600">上位ランキング</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>総合ランキング</CardTitle>
            <CardDescription>全カテゴリの最高スコアランキング</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboardData.map((entry) => (
                <div 
                  key={entry.rank} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      entry.rank === 1 ? 'bg-yellow-500' :
                      entry.rank === 2 ? 'bg-gray-400' :
                      entry.rank === 3 ? 'bg-amber-600' :
                      'bg-blue-500'
                    }`}>
                      {entry.rank}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{entry.name}</p>
                      <p className="text-sm text-gray-600">{entry.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{entry.score}</p>
                    <p className="text-xs text-gray-500">points</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link 
            href="/quiz" 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
          >
            クイズに挑戦してランキングに参加
          </Link>
        </div>
      </div>
    </main>
  )
}
