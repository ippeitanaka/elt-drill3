-- Supabaseのテーブル構造を確認するためのクエリ
-- 以下のクエリをSupabase SQLエディタで実行して、テーブル構造を確認してください

-- 1. すべてのテーブル一覧を取得
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. categoriesテーブルの構造
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'categories'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. questionsテーブルの構造
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'questions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. question_setsテーブルの構造
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'question_sets'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. 既存データの確認
SELECT * FROM categories LIMIT 5;
SELECT * FROM question_sets LIMIT 5;
SELECT * FROM questions LIMIT 5;
