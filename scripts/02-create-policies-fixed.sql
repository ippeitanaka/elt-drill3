-- RLS ポリシーの修正版
-- INSERTポリシーの構文エラーを修正

-- Users policies
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow user creation" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories policies
CREATE POLICY "Categories are readable by authenticated users" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert categories" ON categories FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update categories" ON categories FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete categories" ON categories FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Question sets policies
CREATE POLICY "Question sets readable by authenticated users" ON question_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert question sets" ON question_sets FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update question sets" ON question_sets FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete question sets" ON question_sets FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Questions policies
CREATE POLICY "Questions readable by authenticated users" ON questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert questions" ON questions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update questions" ON questions FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete questions" ON questions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Study sessions policies
CREATE POLICY "Users can read own study sessions" ON study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own study sessions" ON study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own study sessions" ON study_sessions FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own study sessions" ON study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- PDF uploads policies
CREATE POLICY "Admins can read PDF uploads" ON pdf_uploads FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can insert PDF uploads" ON pdf_uploads FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update PDF uploads" ON pdf_uploads FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete PDF uploads" ON pdf_uploads FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Badges policies
CREATE POLICY "Badges readable by authenticated users" ON badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert badges" ON badges FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update badges" ON badges FOR UPDATE TO authenticated 
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete badges" ON badges FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- User badges policies
CREATE POLICY "Users can read own badges" ON user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert user badges" ON user_badges FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete own badges" ON user_badges FOR DELETE TO authenticated USING (auth.uid() = user_id);

SELECT 'RLSポリシーの作成が完了しました。' as message;
