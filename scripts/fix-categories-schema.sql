-- categoriesテーブルにicon、colorカラムを追加
-- 既存のカラムも確認し、必要に応じて作成

-- まずテーブルが存在するか確認
DO $$
BEGIN
    -- categoriesテーブルにiconカラムを追加（存在しない場合）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'icon'
    ) THEN
        ALTER TABLE categories ADD COLUMN icon TEXT DEFAULT '📚';
    END IF;

    -- categoriesテーブルにcolorカラムを追加（存在しない場合）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'color'
    ) THEN
        ALTER TABLE categories ADD COLUMN color TEXT DEFAULT 'blue';
    END IF;

    -- descriptionカラムも確認（存在しない場合は追加）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'description'
    ) THEN
        ALTER TABLE categories ADD COLUMN description TEXT;
    END IF;
END $$;

-- 既存データにアイコンと色を設定
UPDATE categories SET 
    icon = CASE 
        WHEN name LIKE '%心肺蘇生%' THEN '❤️'
        WHEN name LIKE '%薬理%' THEN '💊'
        WHEN name LIKE '%外傷%' THEN '🩹'
        WHEN name LIKE '%呼吸器%' THEN '🫁'
        WHEN name LIKE '%循環器%' THEN '❤️'
        WHEN name LIKE '%法規%' OR name LIKE '%制度%' THEN '📋'
        ELSE '📚'
    END,
    color = CASE 
        WHEN name LIKE '%心肺蘇生%' THEN 'red'
        WHEN name LIKE '%薬理%' THEN 'purple'
        WHEN name LIKE '%外傷%' THEN 'orange'
        WHEN name LIKE '%呼吸器%' THEN 'blue'
        WHEN name LIKE '%循環器%' THEN 'pink'
        WHEN name LIKE '%法規%' OR name LIKE '%制度%' THEN 'gray'
        ELSE 'green'
    END,
    description = CASE 
        WHEN description IS NULL OR description = '' THEN name || 'に関する問題'
        ELSE description
    END
WHERE icon IS NULL OR color IS NULL OR description IS NULL OR description = '';

-- 確認クエリ
SELECT 
    id, 
    name, 
    description, 
    icon, 
    color, 
    created_at 
FROM categories 
ORDER BY id;
