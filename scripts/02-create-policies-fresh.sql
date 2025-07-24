-- RLS ポリシーの作成
-- scripts/01-create-fresh-tables.sql を先に実行してください

-- Users policies
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow user creation" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories policies
CREATE POLICY "Categories are readable by authenticated users" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Question sets policies
CREATE POLICY "Question sets readable by authenticated users" ON question_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage question sets" ON question_sets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Questions policies
CREATE POLICY "Questions readable by authenticated users" ON questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage questions" ON questions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Study sessions policies
CREATE POLICY "Users can manage own study sessions" ON study_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);

-- PDF uploads policies
CREATE POLICY "Admins can manage PDF uploads" ON pdf_uploads FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Badges policies
CREATE POLICY "Badges readable by authenticated users" ON badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage badges" ON badges FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- User badges policies
CREATE POLICY "Users can read own badges" ON user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert user badges" ON user_badges FOR INSERT TO authenticated USING (true);

SELECT 'RLSポリシーの作成が完了しました。' as message;
