-- セットアップの確認用スクリプト

-- 作成されたテーブルを確認
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 作成された型を確認
SELECT 
    typname as type_name,
    typtype as type_type
FROM pg_type 
WHERE typname IN ('user_role', 'difficulty_level', 'quiz_mode');

-- RLSが有効になっているか確認
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;

SELECT 'セットアップ確認が完了しました。' as message;
