-- カテゴリーと問題数の確認
SELECT 
  c.id,
  c.name,
  c.description,
  c.question_count,
  COUNT(q.id) as actual_questions,
  COUNT(qs.id) as question_sets
FROM categories c
LEFT JOIN questions q ON c.id = q.category_id
LEFT JOIN question_sets qs ON c.id = qs.category_id
GROUP BY c.id, c.name, c.description, c.question_count
ORDER BY c.name;

-- 問題セットの詳細
SELECT 
  qs.id,
  qs.title,
  qs.description,
  qs.category_id,
  c.name as category_name,
  COUNT(q.id) as questions_in_set
FROM question_sets qs
JOIN categories c ON qs.category_id = c.id
LEFT JOIN questions q ON qs.id = q.question_set_id
GROUP BY qs.id, qs.title, qs.description, qs.category_id, c.name
ORDER BY qs.created_at DESC;

-- 最近追加された問題
SELECT 
  q.id,
  q.question_text,
  q.category_id,
  c.name as category_name,
  q.created_at
FROM questions q
JOIN categories c ON q.category_id = c.id
ORDER BY q.created_at DESC
LIMIT 10;
