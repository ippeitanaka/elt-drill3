-- 予め設定された管理者アカウントを作成
-- メールアドレス: elt@toyoiryo.ac.jp
-- パスワード: TOYOqq01

-- まず、該当するユーザーが既に存在するかチェック
DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'elt@toyoiryo.ac.jp';
    admin_name TEXT := '東洋医療専門学校管理者';
BEGIN
    -- 既存のユーザーをチェック
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = admin_email;
    
    IF admin_user_id IS NULL THEN
        -- ユーザーが存在しない場合、新規作成
        -- 注意: 実際のSupabaseでは、auth.usersへの直接挿入は推奨されません
        -- 代わりに、Supabase Auth APIまたはダッシュボードを使用してください
        
        RAISE NOTICE 'ユーザー % が見つかりません。Supabaseダッシュボードで手動作成してください。', admin_email;
        
        -- 代替案: public.usersテーブルにプレースホルダーを作成
        -- 実際のauth.usersレコードは手動で作成する必要があります
        
    ELSE
        -- 既存ユーザーを管理者に昇格
        INSERT INTO public.users (id, name, email, role, created_at, updated_at)
        VALUES (admin_user_id, admin_name, admin_email, 'admin', NOW(), NOW())
        ON CONFLICT (id) 
        DO UPDATE SET 
            role = 'admin',
            updated_at = NOW();
            
        RAISE NOTICE '既存ユーザー % を管理者に昇格しました。', admin_email;
    END IF;
END $$;

-- 管理者ユーザーを手動で昇格させる関数
CREATE OR REPLACE FUNCTION promote_user_to_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    user_record RECORD;
    result_message TEXT;
BEGIN
    -- ユーザーを検索
    SELECT au.id, au.email, pu.name, pu.role
    INTO user_record
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE au.email = user_email;
    
    IF NOT FOUND THEN
        result_message := 'ユーザー ' || user_email || ' が見つかりません。';
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

-- 指定された管理者アカウントを昇格
-- 注意: このユーザーは事前にSupabaseダッシュボードまたはAuth APIで作成されている必要があります
SELECT promote_user_to_admin('elt@toyoiryo.ac.jp');
