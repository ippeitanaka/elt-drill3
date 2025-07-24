-- 管理者昇格関数の作成
-- この関数を作成してから promote_user_to_admin を実行してください

CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    user_record RECORD;
    result_message TEXT;
BEGIN
    -- ユーザーを検索
    SELECT au.id, au.email, au.raw_user_meta_data->>'name' as name
    INTO user_record
    FROM auth.users au
    WHERE au.email = user_email;
    
    IF NOT FOUND THEN
        result_message := 'ユーザー ' || user_email || ' が見つかりません。Supabaseダッシュボードで先にユーザーを作成してください。';
        RAISE NOTICE '%', result_message;
        RETURN result_message;
    END IF;
    
    -- public.usersテーブルにレコードを作成または更新
    INSERT INTO public.users (id, name, email, role, created_at, updated_at)
    VALUES (
        user_record.id, 
        COALESCE(user_record.name, '管理者'), 
        user_email, 
        'admin', 
        NOW(), 
        NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET 
        role = 'admin',
        updated_at = NOW();
    
    result_message := 'ユーザー ' || user_email || ' を管理者に昇格しました。';
    RAISE NOTICE '%', result_message;
    RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の実行権限を付与
GRANT EXECUTE ON FUNCTION promote_user_to_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_user_to_admin(TEXT) TO service_role;

-- カテゴリー問題数更新関数も作成
CREATE OR REPLACE FUNCTION update_category_question_count(category_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE categories 
  SET total_questions = (
    SELECT COUNT(q.id)
    FROM questions q
    JOIN question_sets qs ON q.question_set_id = qs.id
    WHERE qs.category_id = update_category_question_count.category_id
  ),
  updated_at = NOW()
  WHERE id = update_category_question_count.category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_category_question_count(UUID) TO authenticated;

-- 関数が正常に作成されたかテスト
SELECT 'promote_user_to_admin関数が作成されました。' as message;

-- 作成された関数を確認
SELECT proname, proargnames, proargtypes 
FROM pg_proc 
WHERE proname IN ('promote_user_to_admin', 'update_category_question_count');
