# 救急医療ドリルアプリ

救急医療技術者学生向けの包括的なドリル学習アプリケーションです。

## 🚀 セットアップ手順

### 1. 環境変数設定
`.env.local` ファイルに以下の環境変数を設定してください：

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://hfanhwznppxngpbjkgno.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW5od3pucHB4bmdwYmprZ25vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDc0MDEsImV4cCI6MjA2Nzg4MzQwMX0.38vPdxOHreyEXV41mRUDBZO15Y6R0umyUI1s26W1eDE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW5od3pucHB4bmdwYmprZ25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjMwNzQwMSwiZXhwIjoyMDY3ODgzNDAxfQ.A5xIaYlRhjWRv5jT-QdCUB8ThV2u_ufXXnV_o6dZ-a4
ADMIN_SETUP_KEY=PARAMEDIC_ADMIN_2024
\`\`\`

### 2. データベースセットアップ
Supabaseダッシュボードで以下のSQLスクリプトを順番に実行してください：

1. `scripts/01-create-tables.sql` - テーブル作成
2. `scripts/02-seed-data.sql` - サンプルデータ投入
3. `scripts/03-add-rpc-functions.sql` - 関数作成
4. `scripts/04-create-admin-user.sql` - 管理者ユーザー関数
5. `scripts/05-create-predefined-admin.sql` - 予め設定された管理者

### 3. 管理者アカウント作成
Supabaseダッシュボードの Authentication > Users で以下の管理者アカウントを手動作成してください：

- **メールアドレス**: elt@toyoiryo.ac.jp
- **パスワード**: TOYOqq01
- **名前**: 東洋医療専門学校管理者

作成後、SQLエディタで以下を実行して管理者権限を付与：
\`\`\`sql
SELECT promote_user_to_admin('elt@toyoiryo.ac.jp');
\`\`\`

## 🔐 ログイン情報

### 管理者アカウント
- **メール**: elt@toyoiryo.ac.jp
- **パスワード**: TOYOqq01
- **アクセス**: `/admin` で管理画面にアクセス可能

### 学生アカウント
- 新規登録: `/auth` ページから作成
- 自動的に学生ロールが付与されます

## 📱 主要機能

### 👨‍🎓 学生機能
- カテゴリー別学習（心肺蘇生法、薬理学など）
- 柔軟なクイズモード（全問題、ランダム、時間制限）
- 詳細な結果表示と解説
- 学習履歴とスコア追跡
- ランキングとバッジシステム

### 🧑‍🏫 管理者機能
- カテゴリー管理（作成・編集・削除）
- PDF アップロードとOCR解析
- 問題セット管理
- ユーザー管理とロール変更
- 学習データ分析

## 🛠 技術スタック
- **フロントエンド**: Next.js 13+ (App Router)
- **バックエンド**: Supabase (PostgreSQL + Auth + Storage)
- **スタイリング**: Tailwind CSS + shadcn/ui
- **認証**: Supabase Auth + Row Level Security

## 📊 データベース構造
- users: ユーザー情報（学生・管理者）
- categories: 学習カテゴリー
- question_sets: 問題セット
- questions: 個別問題
- study_sessions: 学習履歴
- badges: バッジシステム
- pdf_uploads: PDFファイル管理

## 🚀 デプロイ
1. Vercelにプロジェクトをデプロイ
2. 環境変数を設定
3. Supabaseでデータベースセットアップ
4. 管理者アカウント作成

## 📞 サポート
問題や質問がある場合は、開発チームまでお問い合わせください。
