-- 既存のデータベースオブジェクトを完全にクリーンアップ
-- ⚠️ 注意：既存のデータがすべて削除されます ⚠️

-- テーブルを削除（CASCADE で依存関係も削除）
DROP TABLE IF EXISTS public.user_badges CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;
DROP TABLE IF EXISTS public.pdf_uploads CASCADE;
DROP TABLE IF EXISTS public.study_sessions CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.question_sets CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 型を削除
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS difficulty_level CASCADE;
DROP TYPE IF EXISTS quiz_mode CASCADE;

-- 関数を削除
DROP FUNCTION IF EXISTS promote_user_to_admin(TEXT);
DROP FUNCTION IF EXISTS update_category_question_count(UUID);
DROP FUNCTION IF EXISTS create_admin_user(TEXT, TEXT, TEXT);

SELECT 'データベースのクリーンアップが完了しました。次にテーブルを作成してください。' as message;
