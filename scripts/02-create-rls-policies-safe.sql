-- RLS (Row Level Security) ポリシーの安全な設定
-- 既存のポリシーがある場合は置き換える

-- Users policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow user creation" ON users;
CREATE POLICY "Allow user creation" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories policies
DROP POLICY IF EXISTS "Categories are readable by authenticated users" ON categories;
CREATE POLICY "Categories are readable by authenticated users" ON categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories" ON categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Question sets policies
DROP POLICY IF EXISTS "Question sets readable by authenticated users" ON question_sets;
CREATE POLICY "Question sets readable by authenticated users" ON question_sets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage question sets" ON question_sets;
CREATE POLICY "Admins can manage question sets" ON question_sets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Questions policies
DROP POLICY IF EXISTS "Questions readable by authenticated users" ON questions;
CREATE POLICY "Questions readable by authenticated users" ON questions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
CREATE POLICY "Admins can manage questions" ON questions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Study sessions policies
DROP POLICY IF EXISTS "Users can manage own study sessions" ON study_sessions;
CREATE POLICY "Users can manage own study sessions" ON study_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);

-- PDF uploads policies
DROP POLICY IF EXISTS "Admins can manage PDF uploads" ON pdf_uploads;
CREATE POLICY "Admins can manage PDF uploads" ON pdf_uploads FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Badges policies
DROP POLICY IF EXISTS "Badges readable by authenticated users" ON badges;
CREATE POLICY "Badges readable by authenticated users" ON badges FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage badges" ON badges;
CREATE POLICY "Admins can manage badges" ON badges FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- User badges policies
DROP POLICY IF EXISTS "Users can read own badges" ON user_badges;
CREATE POLICY "Users can read own badges" ON user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert user badges" ON user_badges;
CREATE POLICY "System can insert user badges" ON user_badges FOR INSERT TO authenticated USING (true);

SELECT 'RLSポリシーの設定が完了しました。' as message;
