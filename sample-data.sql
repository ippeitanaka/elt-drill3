-- Supabaseデータベースのテストデータ作成スクリプト
-- 管理者がカテゴリー管理機能をテストできるよう、初期データを準備

-- カテゴリーテーブルにサンプルデータを挿入
INSERT INTO categories (name, description, icon, color) VALUES
('英文法基礎', '基本的な英文法をマスターしよう', '📚', 'bg-blue-500'),
('語彙力強化', '重要単語とフレーズを覚えよう', '📝', 'bg-green-500'),
('リーディング', '読解力を向上させよう', '📖', 'bg-purple-500'),
('リスニング', '聞き取り能力を鍛えよう', '🎧', 'bg-red-500'),
('ライティング', '英作文スキルを身につけよう', '✍️', 'bg-yellow-500')
ON CONFLICT (name) DO NOTHING;

-- 問題セットテーブルにサンプルデータを挿入
INSERT INTO question_sets (category_id, title, description, order_index, is_active) 
SELECT 
  c.id,
  CASE 
    WHEN c.name = '英文法基礎' THEN '現在形・過去形'
    WHEN c.name = '語彙力強化' THEN '学術語彙'
    WHEN c.name = 'リーディング' THEN '短文読解'
    WHEN c.name = 'リスニング' THEN '基本対話'
    WHEN c.name = 'ライティング' THEN '基本作文'
  END as title,
  CASE 
    WHEN c.name = '英文法基礎' THEN '基本的な時制の使い方'
    WHEN c.name = '語彙力強化' THEN '大学受験レベルの重要単語'
    WHEN c.name = 'リーディング' THEN '基本的な読解問題'
    WHEN c.name = 'リスニング' THEN '日常会話の聞き取り'
    WHEN c.name = 'ライティング' THEN '基本的な英作文'
  END as description,
  1 as order_index,
  true as is_active
FROM categories c
WHERE c.name IN ('英文法基礎', '語彙力強化', 'リーディング', 'リスニング', 'ライティング')
ON CONFLICT DO NOTHING;

-- サンプル問題を挿入
INSERT INTO questions (category_id, question_text, choices, correct_answer, explanation, difficulty_level, points)
SELECT 
  c.id,
  'This is a sample question for ' || c.name || '. What is the correct answer?',
  ARRAY['Option A', 'Option B', 'Option C', 'Option D', 'Option E'],
  1,
  'This is a sample explanation for the correct answer.',
  1,
  10
FROM categories c
WHERE c.name IN ('英文法基礎', '語彙力強化', 'リーディング', 'リスニング', 'ライティング')
ON CONFLICT DO NOTHING;
