-- 5択問題用のサンプルデータ投入
-- scripts/07-update-questions-for-5-choices.sql を先に実行してください

-- 既存の問題を削除（5択に更新するため）
DELETE FROM questions;

-- Insert sample categories
INSERT INTO categories (name, icon, color, description) VALUES
('心肺蘇生法', 'heart-pulse', 'red', '心停止患者への蘇生処置に関する問題'),
('薬理学', 'pill', 'blue', '救急薬剤の作用機序と使用法'),
('外傷処置', 'bandage', 'orange', '外傷患者の初期評価と処置'),
('呼吸器疾患', 'lungs', 'green', '呼吸困難患者への対応'),
('循環器疾患', 'heart', 'purple', '循環器系の救急疾患')
ON CONFLICT (name) DO NOTHING;

-- Insert sample badges
INSERT INTO badges (name, description, icon, color, condition_type, condition_value) VALUES
('完璧な成績', '100点を獲得', 'trophy', 'gold', 'perfect_score', 100),
('継続学習者', '7日連続で学習', 'flame', 'orange', 'streak', 7),
('熟練者', '50問セット完了', 'star', 'blue', 'total_completed', 50),
('スピードマスター', '制限時間の半分で完了', 'zap', 'yellow', 'speed', 50)
ON CONFLICT (name) DO NOTHING;

-- Insert sample question sets
INSERT INTO question_sets (category_id, title, description, order_index) 
SELECT 
  c.id,
  CASE 
    WHEN c.name = '心肺蘇生法' THEN 'BLS基礎'
    WHEN c.name = '薬理学' THEN '救急薬剤基礎'
    WHEN c.name = '外傷処置' THEN '外傷初期評価'
    WHEN c.name = '呼吸器疾患' THEN '呼吸困難の鑑別'
    WHEN c.name = '循環器疾患' THEN '胸痛の鑑別'
  END,
  CASE 
    WHEN c.name = '心肺蘇生法' THEN 'BLSの基本的な手順と技術'
    WHEN c.name = '薬理学' THEN '救急現場で使用する基本薬剤'
    WHEN c.name = '外傷処置' THEN 'ABCDEアプローチによる評価'
    WHEN c.name = '呼吸器疾患' THEN '呼吸困難の原因と対応'
    WHEN c.name = '循環器疾患' THEN '胸痛の原因と緊急度判定'
  END,
  1
FROM categories c
ON CONFLICT (category_id, title) DO NOTHING;

-- Insert sample 5-choice questions
INSERT INTO questions (question_set_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, difficulty, explanation, order_index)
SELECT 
  qs.id,
  '成人の心肺蘇生において、胸骨圧迫の深さはどのくらいが適切ですか？',
  '3-4cm',
  '5-6cm',
  '7-8cm',
  '9-10cm',
  '11-12cm',
  'B',
  'medium',
  '成人のCPRでは胸骨圧迫の深さは5-6cmが推奨されています。',
  1
FROM question_sets qs
JOIN categories c ON qs.category_id = c.id
WHERE c.name = '心肺蘇生法'
LIMIT 1;

INSERT INTO questions (question_set_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, difficulty, explanation, order_index)
SELECT 
  qs.id,
  'アドレナリンの主な作用機序は何ですか？',
  'β受容体遮断',
  'α・β受容体刺激',
  'カルシウム拮抗',
  'ACE阻害',
  '利尿作用',
  'B',
  'medium',
  'アドレナリンはα・β受容体を刺激し、心収縮力増強と血管収縮作用を示します。',
  1
FROM question_sets qs
JOIN categories c ON qs.category_id = c.id
WHERE c.name = '薬理学'
LIMIT 1;

INSERT INTO questions (question_set_id, question_text, option_a, option_b, option_c, option_d, option_e, correct_answer, difficulty, explanation, order_index)
SELECT 
  qs.id,
  '外傷患者の初期評価で最初に確認すべきことは何ですか？',
  '意識レベル',
  '気道の確保',
  '呼吸状態',
  '循環状態',
  '神経学的評価',
  'B',
  'medium',
  'ABCDEアプローチでは、まず気道（Airway）の確保が最優先です。',
  1
FROM question_sets qs
JOIN categories c ON qs.category_id = c.id
WHERE c.name = '外傷処置'
LIMIT 1;

-- Update total_questions count
UPDATE categories SET total_questions = (
  SELECT COUNT(q.id)
  FROM questions q
  JOIN question_sets qs ON q.question_set_id = qs.id
  WHERE qs.category_id = categories.id
);

SELECT '5択問題のサンプルデータ投入が完了しました。' as message;
