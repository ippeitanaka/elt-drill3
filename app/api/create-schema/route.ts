import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 新しいデータベーススキーマの作成を開始します...')
    const adminClient = createServerClient()
    
    // 1. 既存テーブルのクリーンアップ
    const cleanupSQL = `
      -- 既存のテーブルを削除（CASCADE で依存関係も削除）
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
    `

    // 2. カスタム型の作成
    const createTypesSQL = `
      -- カスタム型を作成
      CREATE TYPE user_role AS ENUM ('student', 'admin');
      CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
      CREATE TYPE quiz_mode AS ENUM ('timed', 'all_questions', 'random');
    `

    // 3. テーブル作成SQL
    const createTablesSQL = `
      -- Users table (extends Supabase auth.users)
      CREATE TABLE public.users (
        id UUID REFERENCES auth.users(id) PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        role user_role DEFAULT 'student',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Categories table
      CREATE TABLE public.categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT DEFAULT 'heart-pulse',
        color TEXT DEFAULT 'blue',
        description TEXT,
        total_questions INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Question sets table
      CREATE TABLE public.question_sets (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Questions table
      CREATE TABLE public.questions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        option_e TEXT,
        correct_answer CHAR(1) CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
        difficulty difficulty_level DEFAULT 'medium',
        explanation TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Study sessions table
      CREATE TABLE public.study_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        question_set_id UUID REFERENCES question_sets(id) ON DELETE CASCADE,
        score DECIMAL(5,2) NOT NULL,
        correct_count INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        time_taken INTEGER, -- in seconds
        quiz_mode quiz_mode DEFAULT 'all_questions',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- PDF uploads table
      CREATE TABLE public.pdf_uploads (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_type TEXT CHECK (file_type IN ('questions', 'answers')),
        file_size INTEGER,
        uploaded_by UUID REFERENCES users(id),
        is_processed BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Badges table
      CREATE TABLE public.badges (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT 'award',
        color TEXT DEFAULT 'gold',
        condition_type TEXT, -- 'perfect_score', 'streak', 'total_completed'
        condition_value INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- User badges table
      CREATE TABLE public.user_badges (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
        earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, badge_id)
      );
    `

    // 4. RLS有効化SQL
    const enableRLSSQL = `
      -- RLSを有効化
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;
      ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
      ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
      ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
    `

    // 5. RLSポリシー作成SQL
    const createPoliciesSQL = `
      -- Users policies
      CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
      CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

      -- Categories are readable by all authenticated users
      CREATE POLICY "Categories are readable by authenticated users" ON categories FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Admins can manage categories" ON categories FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      );

      -- Question sets and questions are readable by authenticated users
      CREATE POLICY "Question sets readable by authenticated users" ON question_sets FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Questions readable by authenticated users" ON questions FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Admins can manage question sets" ON question_sets FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      );
      CREATE POLICY "Admins can manage questions" ON questions FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      );

      -- Study sessions are private to users
      CREATE POLICY "Users can manage own study sessions" ON study_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);

      -- PDF uploads are admin only
      CREATE POLICY "Admins can manage PDF uploads" ON pdf_uploads FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      );

      -- Badges are readable by all, user_badges are private
      CREATE POLICY "Badges readable by authenticated users" ON badges FOR SELECT TO authenticated USING (true);
      CREATE POLICY "Users can read own badges" ON user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
      CREATE POLICY "System can insert user badges" ON user_badges FOR INSERT TO authenticated USING (true);
    `

    console.log('1. 既存テーブルのクリーンアップ...')
    const { error: cleanupError } = await adminClient.rpc('exec', { sql: cleanupSQL })
    if (cleanupError && !cleanupError.message.includes('does not exist')) {
      console.error('Cleanup error:', cleanupError.message)
    }

    console.log('2. カスタム型の作成...')
    const { error: typesError } = await adminClient.rpc('exec', { sql: createTypesSQL })
    if (typesError) {
      console.error('Types creation error:', typesError.message)
      return NextResponse.json({ success: false, error: 'Types creation failed: ' + typesError.message }, { status: 500 })
    }

    console.log('3. テーブルの作成...')
    const { error: tablesError } = await adminClient.rpc('exec', { sql: createTablesSQL })
    if (tablesError) {
      console.error('Tables creation error:', tablesError.message)
      return NextResponse.json({ success: false, error: 'Tables creation failed: ' + tablesError.message }, { status: 500 })
    }

    console.log('4. RLSの有効化...')
    const { error: rlsError } = await adminClient.rpc('exec', { sql: enableRLSSQL })
    if (rlsError) {
      console.error('RLS enable error:', rlsError.message)
    }

    console.log('5. RLSポリシーの作成...')
    const { error: policiesError } = await adminClient.rpc('exec', { sql: createPoliciesSQL })
    if (policiesError) {
      console.error('Policies creation error:', policiesError.message)
    }

    // 6. 作成確認
    const { data: categories, error: verifyError } = await adminClient
      .from('categories')
      .select('count')
      .limit(1)

    return NextResponse.json({
      success: true,
      message: '✅ 新しいデータベーススキーマの作成が完了しました！',
      verification: {
        categories_table_created: !verifyError,
        ready_for_data: !verifyError
      }
    })

  } catch (error: any) {
    console.error('Schema creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    )
  }
}
