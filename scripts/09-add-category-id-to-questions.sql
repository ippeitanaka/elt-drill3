-- questionsテーブルにcategory_idカラムを追加
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- 既存の問題にcategory_idを設定（question_setsから取得）
UPDATE questions 
SET category_id = qs.category_id 
FROM question_sets qs 
WHERE questions.question_set_id = qs.id 
AND questions.category_id IS NULL;

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);

-- 確認クエリ
SELECT 
  c.name as category_name,
  COUNT(q.id) as question_count
FROM categories c
LEFT JOIN questions q ON c.id = q.category_id
GROUP BY c.id, c.name
ORDER BY c.name;
