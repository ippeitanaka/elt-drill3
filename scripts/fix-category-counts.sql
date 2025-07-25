-- カテゴリーの問題数を実際の問題数に更新
UPDATE categories 
SET question_count = (
  SELECT COUNT(*) 
  FROM questions 
  WHERE questions.category_id = categories.id
);

-- 更新後の確認
SELECT 
  c.id,
  c.name,
  c.question_count,
  COUNT(q.id) as actual_questions
FROM categories c
LEFT JOIN questions q ON c.id = q.category_id
GROUP BY c.id, c.name, c.question_count
ORDER BY c.name;
