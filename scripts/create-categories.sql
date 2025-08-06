-- categoriesテーブルに基本的な救急救命士試験カテゴリーを作成

INSERT INTO categories (name) VALUES 
('心肺蘇生法'),
('薬理学'),
('外傷処置'),
('呼吸器疾患'),
('循環器疾患'),
('法規・制度')
ON CONFLICT (name) DO NOTHING;

-- 確認クエリ
SELECT * FROM categories ORDER BY id;
