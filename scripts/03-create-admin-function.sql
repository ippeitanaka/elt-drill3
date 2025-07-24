-- 管理者昇格関数の作成
-- テーブル作成後に実行してください

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

SELECT 'promote_user_to_admin関数が作成されました。' as message;
