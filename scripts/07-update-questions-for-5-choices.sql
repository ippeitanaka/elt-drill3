-- 問題テーブルを5択に対応するよう更新

-- 新しい選択肢Eカラムを追加
ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_e TEXT;

-- 正解の制約を5択に更新
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_correct_answer_check;
ALTER TABLE questions ADD CONSTRAINT questions_correct_answer_check 
CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E'));

-- 既存の問題にデフォルトの選択肢Eを追加（必要に応じて）
UPDATE questions 
SET option_e = '該当なし' 
WHERE option_e IS NULL;

-- option_eを必須にする
ALTER TABLE questions ALTER COLUMN option_e SET NOT NULL;

SELECT '5択対応の更新が完了しました。' as message;
