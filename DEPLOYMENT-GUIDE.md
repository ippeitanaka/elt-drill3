# 救急救命士国家試験対策アプリ - デプロイガイド

## 🚀 Vercelデプロイ手順

### 1. Vercelでプロジェクトをインポート
1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. "New Project" をクリック
3. "Import Git Repository" を選択
4. GitHubリポジトリ `https://github.com/ippeitanaka/elt-drill3.git` を選択

### 2. 環境変数の設定
以下の環境変数をVercelの設定画面で追加してください：

```
NEXT_PUBLIC_SUPABASE_URL=あなたのSupabaseプロジェクトURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのSupabase匿名キー
```

### 3. ビルド設定
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 4. デプロイ前チェックリスト

#### Supabaseデータベース設定
1. 以下のテーブルが作成されていることを確認：
   - `categories` (カテゴリー管理)
   - `question_sets` (問題セット)
   - `questions` (個別問題)
   - `pdf_uploads` (PDF管理)

2. Row Level Security (RLS) ポリシーが設定されていることを確認

#### アプリケーション機能
- ✅ カテゴリー管理
- ✅ PDF アップロード
- ✅ 問題表示・クイズ機能
- ✅ 大容量PDF処理
- ✅ レスポンシブデザイン

## 📋 アプリケーション概要

### 主要機能
1. **管理者機能** (`/admin`)
   - カテゴリー管理
   - PDFアップロード
   - データベース管理

2. **クイズ機能** (`/quiz`)
   - カテゴリー別問題表示
   - 回答・採点機能
   - 進捗管理

3. **リーダーボード** (`/leaderboard`)
   - スコア管理
   - ランキング表示

### 技術スタック
- **フロントエンド**: Next.js 14, React 18, TypeScript
- **UI**: Tailwind CSS, Radix UI
- **バックエンド**: Supabase (PostgreSQL)
- **PDF処理**: PDF.js, Tesseract.js (OCR)
- **デプロイ**: Vercel

## 🔧 ローカル開発環境

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start
```

## 📝 注意事項

1. **環境変数**: Supabaseの認証情報は正確に設定してください
2. **PDF処理**: 大容量ファイルの処理には時間がかかる場合があります
3. **データベース**: 初回デプロイ後にサンプルデータを投入することを推奨します

## 🎯 次のステップ

1. Vercelでデプロイ完了後、URLを確認
2. 管理者ページでカテゴリーとサンプル問題を設定
3. クイズ機能の動作確認
4. 必要に応じてカスタムドメインを設定
