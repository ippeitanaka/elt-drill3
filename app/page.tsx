import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Trophy, Settings, Star, Target, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ヒーローセクション */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4 mr-2" />
            新機能: AI搭載OCR問題解析システム
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-6">
            救急救命士国家試験対策アプリ
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            AI技術を活用した救急救命士国家試験学習プラットフォーム
            <br />
            <span className="text-lg text-gray-500">効率的な学習で国家試験合格を目指しましょう</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/quiz">
              <Button size="lg" className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-lg px-8 py-3">
                <BookOpen className="w-5 h-5 mr-2" />
                学習を開始
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3 border-red-200 hover:bg-red-50">
                <Trophy className="w-5 h-5 mr-2" />
                ランキング確認
              </Button>
            </Link>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <Target className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-red-900 mb-2">1,000+</h3>
              <p className="text-red-700">国家試験問題</p>
            </CardContent>
          </Card>
          <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <Users className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-orange-900 mb-2">500+</h3>
              <p className="text-orange-700">学習者</p>
            </CardContent>
          </Card>
          <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-6">
              <Star className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-yellow-900 mb-2">95%</h3>
              <p className="text-yellow-700">合格率向上</p>
            </CardContent>
          </Card>
        </div>

        {/* メイン機能 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">
                過去問演習
              </CardTitle>
              <CardDescription className="text-gray-600">
                実際の国家試験問題で実力を試し、弱点を克服
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/quiz">
                <Button className="w-full bg-red-600 hover:bg-red-700 font-medium">
                  問題を解く
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">
                成績ランキング
              </CardTitle>
              <CardDescription className="text-gray-600">
                全国の受験生と実力を比較し、学習意欲を向上
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/leaderboard">
                <Button className="w-full bg-orange-600 hover:bg-orange-700 font-medium">
                  ランキング確認
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">
                教員・管理者用
              </CardTitle>
              <CardDescription className="text-gray-600">
                問題の追加・編集、学生の進捗管理（教員・管理者専用）
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/admin">
                <Button className="w-full bg-green-600 hover:bg-green-700 font-medium">
                  管理画面
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* 特徴セクション */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">なぜ救急救命士国家試験対策アプリなのか？</h2>
          <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
            最新のAI技術と医学教育を組み合わせた、効果的な国家試験対策を提供します
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">実際の出題傾向</h3>
              <p className="text-sm text-gray-600">過去の国家試験データに基づいた問題構成</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">弱点分析</h3>
              <p className="text-sm text-gray-600">苦手分野を特定し重点的に学習</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">模擬試験機能</h3>
              <p className="text-sm text-gray-600">本番同様の環境で実力確認</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">合格実績</h3>
              <p className="text-sm text-gray-600">詳細な学習進捗と成績管理</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
