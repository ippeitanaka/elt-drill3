import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST() {
  try {
    const adminClient = createServerClient()
    
    console.log('🔧 quiz_sessions テーブルを作成中...')
    
    // quiz_sessions テーブルを直接作成
    const { data, error } = await adminClient
      .from('quiz_sessions')
      .select('*')
      .limit(1)
    
    if (error && error.code === 'PGRST116') {
      // テーブルが存在しない場合の確認
      console.log('quiz_sessions テーブルが存在しません。データベースに追加が必要です。')
      return NextResponse.json({
        success: false,
        message: 'quiz_sessions テーブルが存在しません。Supabaseの管理画面で以下のSQLを実行してください:',
        sql: `
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  category_id BIGINT REFERENCES categories(id),
  question_set_id BIGINT REFERENCES question_sets(id),
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_taken INTEGER, -- 秒数
  answers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシーを有効化
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のセッションのみ参照・作成可能
CREATE POLICY "Users can view own quiz sessions" ON quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz sessions" ON quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
        `,
        error: error.message
      }, { status: 400 })
    } else if (error) {
      console.error('予期しないエラー:', error)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    } else {
      console.log('✅ quiz_sessions テーブルは既に存在します')
      return NextResponse.json({
        success: true,
        message: 'quiz_sessions テーブルは正常に存在します',
        data
      })
    }

  } catch (error: any) {
    console.error('🚨 テーブル作成処理エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'テーブル作成処理でエラーが発生しました'
    }, { status: 500 })
  }
}
