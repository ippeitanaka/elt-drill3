-- データベースセットアップの実行順序
-- 以下のスクリプトを順番に実行してください：

-- 1. テーブル作成（最初に実行）
-- scripts/01-create-tables.sql

-- 2. サンプルデータ投入
-- scripts/02-seed-data.sql

-- 3. RPC関数追加
-- scripts/03-add-rpc-functions.sql

-- 4. 管理者ユーザー関数
-- scripts/04-create-admin-user.sql

-- 5. 予め設定された管理者（最後に実行）
-- scripts/05-create-predefined-admin.sql

-- 現在のエラー: public.usersテーブルが存在しません
-- 解決方法: まず scripts/01-create-tables.sql を実行してください
