# ELT-DRILL デプロイ手順書

## 🚀 Vercelデプロイ手順

### 前提条件
- GitHubアカウント
- Vercelアカウント
- Supabaseプロジェクト

### 1. GitHubリポジトリ準備

```bash
# リポジトリの初期化（ローカル）
cd elt-drill-main
git init
git add .
git commit -m "Initial commit: OCR機能付きELT-DRILL"

# GitHubにプッシュ
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/elt-drill.git
git push -u origin main
```

### 2. Vercelでのデプロイ

1. **Vercelにログイン**
   - https://vercel.com にアクセス
   - GitHubアカウントでログイン

2. **新しいプロジェクトを作成**
   - "New Project" をクリック
   - GitHubリポジトリを選択
   - `elt-drill` リポジトリをインポート

3. **ビルド設定**
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install --legacy-peer-deps`

4. **環境変数の設定**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ADMIN_SECRET_KEY=your_secure_admin_key
   ```

5. **デプロイ実行**
   - "Deploy" ボタンをクリック
   - ビルドが完了するまで待機

### 3. Supabase設定確認

#### 必要なテーブル
- `categories`
- `question_sets`
- `questions`
- `quiz_attempts`
- `pdf_uploads`

#### ストレージ設定
```sql
-- PDFs用のバケット作成
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

-- ストレージポリシー設定
CREATE POLICY "Anyone can upload PDFs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Anyone can view PDFs" ON storage.objects
FOR SELECT USING (bucket_id = 'pdfs');
```

#### RLS（Row Level Security）ポリシー
```sql
-- 必要なポリシーを設定
-- /scripts/*.sql ファイルを参照
```

### 4. 管理者アカウント設定

1. **初回アクセス**
   - デプロイされたURLにアクセス
   - `/auth` で管理者アカウント作成

2. **管理者権限付与**
   ```sql
   -- Supabaseのダッシュボードで実行
   UPDATE auth.users 
   SET raw_app_meta_data = '{"role": "admin"}'::jsonb
   WHERE email = 'your-admin-email@example.com';
   ```

## 🔧 開発環境セットアップ

### 1. 依存関係のインストール

```bash
# 必要なパッケージをインストール
npm install --legacy-peer-deps

# または特定バージョンで
npm install pdfjs-dist@4.0.379 tesseract.js --legacy-peer-deps
```

### 2. 環境変数設定

```bash
# .env.local ファイルを作成
cp .env.example .env.local

# 必要な値を設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
ADMIN_SECRET_KEY=your_admin_key
```

### 3. 開発サーバー起動

```bash
npm run dev
```

## 📋 デプロイ後チェックリスト

### 機能テスト
- [ ] トップページの表示
- [ ] 管理者ログイン
- [ ] カテゴリー作成
- [ ] PDF アップロード（OCR機能）
- [ ] 問題作成・編集
- [ ] クイズ実行
- [ ] リーダーボード表示

### OCR機能テスト
- [ ] PDF テキスト抽出
- [ ] OCR 画像解析
- [ ] 5択問題パターン認識
- [ ] 解答パターン認識
- [ ] デバッグ機能

### パフォーマンステスト
- [ ] ページ読み込み速度
- [ ] PDF処理速度
- [ ] モバイル対応
- [ ] OCR処理安定性

## 🛠️ トラブルシューティング

### ビルドエラー

1. **依存関係エラー**
   ```bash
   npm install --legacy-peer-deps
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **TypeScript エラー**
   ```bash
   npm run build
   # エラーログを確認して修正
   ```

### OCR関連エラー

1. **Tesseract.js 初期化エラー**
   - ネットワーク接続確認
   - Worker URLの確認

2. **PDF.js エラー**
   - CDN URLの確認
   - CORS設定の確認

### Supabase接続エラー

1. **認証エラー**
   - 環境変数の確認
   - Supabase URL/KEYの確認

2. **ポリシーエラー**
   - RLSポリシーの確認
   - 権限設定の確認

## 📈 監視・メンテナンス

### Vercelダッシュボード
- 関数実行時間の監視
- エラーログの確認
- パフォーマンス分析

### Supabaseダッシュボード
- データベース使用量
- ストレージ使用量
- API使用量

## 🔄 継続的デプロイ

GitHubにプッシュすると自動的にVercelでデプロイが実行されます。

```bash
# 変更をプッシュ
git add .
git commit -m "Update: 機能改善"
git push origin main
```

## 📝 重要なファイル

- `lib/ocr.ts` - OCR機能のコア実装
- `components/admin/pdf-upload.tsx` - PDFアップロードUI
- `vercel.json` - Vercelデプロイ設定
- `.env.example` - 環境変数テンプレート
- `scripts/` - データベース設定SQL

---

## 📞 サポート

問題が発生した場合：
1. ログの確認（Vercel/Supabase）
2. 環境変数の再確認
3. 依存関係の再インストール
4. キャッシュのクリア

**最重要**: OCR機能が正常に動作することを確認してからプロダクションデプロイを行ってください。
