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
          <div className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4 mr-2" />
            新機能: AI搭載OCR問題解析システム
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
            ELT Drill App
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            AI技術を活用した次世代の英語学習プラットフォーム
            <br />
            <span className="text-lg text-gray-500">あなたのペースで、効率的に英語力を向上させましょう</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/quiz">
              <Button size="lg" className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-lg px-8 py-3">
                <BookOpen className="w-5 h-5 mr-2" />
                学習を開始
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3 border-indigo-200 hover:bg-indigo-50">
                <Trophy className="w-5 h-5 mr-2" />
                ランキング確認
              </Button>
            </Link>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-blue-900 mb-2">1,000+</h3>
              <p className="text-blue-700">練習問題</p>
            </CardContent>
          </Card>
          <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-900 mb-2">500+</h3>
              <p className="text-green-700">アクティブユーザー</p>
            </CardContent>
          </Card>
          <Card className="text-center border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <Star className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-purple-900 mb-2">95%</h3>
              <p className="text-purple-700">学習効果向上</p>
            </CardContent>
          </Card>
        </div>

        {/* メイン機能 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">
                スマートクイズ
              </CardTitle>
              <CardDescription className="text-gray-600">
                AIが分析したあなたの弱点に特化した問題で効率的に学習
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/quiz">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 font-medium">
                  学習開始
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">
                リーダーボード
              </CardTitle>
              <CardDescription className="text-gray-600">
                全国の学習者と競い合い、モチベーションを維持しよう
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/leaderboard">
                <Button className="w-full bg-green-600 hover:bg-green-700 font-medium">
                  ランキング確認
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">
                管理ツール
              </CardTitle>
              <CardDescription className="text-gray-600">
                問題の追加・編集、学習者の進捗管理（管理者専用）
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/admin">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 font-medium">
                  管理画面
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* 特徴セクション */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">なぜELT Drill Appなのか？</h2>
          <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
            最新のAI技術と学習科学を組み合わせた、効果的な英語学習体験を提供します
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">個別最適化</h3>
              <p className="text-sm text-gray-600">あなたの学習レベルに合わせた問題を自動生成</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">弱点特化</h3>
              <p className="text-sm text-gray-600">苦手分野を重点的にサポート</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">ゲーミフィケーション</h3>
              <p className="text-sm text-gray-600">楽しみながら継続的に学習</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">実績追跡</h3>
              <p className="text-sm text-gray-600">詳細な学習進捗レポート</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
