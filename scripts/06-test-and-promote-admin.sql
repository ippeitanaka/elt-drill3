-- 管理者ユーザーの作成とテスト
-- scripts/05-create-admin-function-now.sql を先に実行してください

-- まず、関数が存在するか確認
SELECT EXISTS(
    SELECT 1 FROM pg_proc 
    WHERE proname = 'promote_user_to_admin'
) as function_exists;

-- auth.usersテーブルでユーザーが存在するか確認
SELECT id, email, raw_user_meta_data->>'name' as name
FROM auth.users 
WHERE email = 'elt@toyoiryo.ac.jp';

-- 管理者に昇格（ユーザーが存在する場合）
SELECT promote_user_to_admin('elt@toyoiryo.ac.jp');

-- 結果を確認
SELECT id, name, email, role, created_at
FROM public.users 
WHERE email = 'elt@toyoiryo.ac.jp';

-- 全ユーザーを確認
SELECT id, name, email, role 
FROM public.users 
ORDER BY created_at;
