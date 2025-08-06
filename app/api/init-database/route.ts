import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('データベース初期化を開始します...')
    const adminClient = createServerClient()
    
    // 1. カスタム型の作成
    const createTypesSQL = `
      -- Create custom types if they don't exist
      DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('student', 'admin');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
          CREATE TYPE quiz_mode AS ENUM ('timed', 'all_questions', 'random');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `

    // 2. usersテーブルの作成
    const createUsersTableSQL = `
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID REFERENCES auth.users(id) PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role user_role DEFAULT 'student',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // 3. badgesテーブルの作成
    const createBadgesTableSQL = `
      CREATE TABLE IF NOT EXISTS public.badges (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT 'award',
        color TEXT DEFAULT 'gold',
        condition_type TEXT,
        condition_value INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // 4. user_badgesテーブルの作成
    const createUserBadgesTableSQL = `
      CREATE TABLE IF NOT EXISTS public.user_badges (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
        earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, badge_id)
      );
    `

    // 5. study_sessionsテーブルの作成
    const createStudySessionsTableSQL = `
      CREATE TABLE IF NOT EXISTS public.study_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
        score DECIMAL(5,2) NOT NULL,
        correct_count INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        time_taken INTEGER,
        quiz_mode quiz_mode DEFAULT 'all_questions',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    // 6. RLSの有効化
    const enableRLSSQL = `
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
      ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
    `

    // 7. RLSポリシーの作成
    const createPoliciesSQL = `
      -- Users policies
      DROP POLICY IF EXISTS "Users can read own data" ON users;
      CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
      
      DROP POLICY IF EXISTS "Users can update own data" ON users;
      CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

      -- Badges policies
      DROP POLICY IF EXISTS "Badges readable by authenticated users" ON badges;
      CREATE POLICY "Badges readable by authenticated users" ON badges FOR SELECT TO authenticated USING (true);
      
      -- User badges policies
      DROP POLICY IF EXISTS "Users can read own badges" ON user_badges;
      CREATE POLICY "Users can read own badges" ON user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
      
      -- Study sessions policies
      DROP POLICY IF EXISTS "Users can manage own study sessions" ON study_sessions;
      CREATE POLICY "Users can manage own study sessions" ON study_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);
    `

    // SQLを順番に実行
    const { error: typesError } = await adminClient.rpc('exec', { sql: createTypesSQL })
    if (typesError) console.log('Types creation result:', typesError.message)

    const { error: usersError } = await adminClient.rpc('exec', { sql: createUsersTableSQL })
    if (usersError) console.log('Users table creation result:', usersError.message)

    const { error: badgesError } = await adminClient.rpc('exec', { sql: createBadgesTableSQL })
    if (badgesError) console.log('Badges table creation result:', badgesError.message)

    const { error: userBadgesError } = await adminClient.rpc('exec', { sql: createUserBadgesTableSQL })
    if (userBadgesError) console.log('User badges table creation result:', userBadgesError.message)

    const { error: studySessionsError } = await adminClient.rpc('exec', { sql: createStudySessionsTableSQL })
    if (studySessionsError) console.log('Study sessions table creation result:', studySessionsError.message)

    const { error: rlsError } = await adminClient.rpc('exec', { sql: enableRLSSQL })
    if (rlsError) console.log('RLS enable result:', rlsError.message)

    const { error: policiesError } = await adminClient.rpc('exec', { sql: createPoliciesSQL })
    if (policiesError) console.log('Policies creation result:', policiesError.message)

    // 結果確認
    const verification = await adminClient
      .from('users')
      .select('count')
      .limit(1)

    return NextResponse.json({
      success: true,
      message: 'データベース初期化が完了しました',
      verification: {
        users_table_accessible: !verification.error
      }
    })

  } catch (error: any) {
    console.error('Database initialization error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}
