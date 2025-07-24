-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Categories table
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Questions table
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  choices TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  points INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Quiz sessions table
CREATE TABLE quiz_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  score INTEGER NOT NULL,
  time_taken INTEGER NOT NULL, -- in seconds
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Achievements table
CREATE TABLE achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  condition_type TEXT NOT NULL, -- 'score', 'streak', 'questions_answered', 'accuracy'
  condition_value INTEGER NOT NULL,
  points_reward INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User achievements table
CREATE TABLE user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Categories policies
CREATE POLICY "Categories are viewable by everyone." ON categories
  FOR SELECT USING (true);

-- Questions policies
CREATE POLICY "Questions are viewable by everyone." ON questions
  FOR SELECT USING (true);

-- Quiz sessions policies
CREATE POLICY "Users can view their own quiz sessions." ON quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz sessions." ON quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Achievements are viewable by everyone." ON achievements
  FOR SELECT USING (true);

-- User achievements policies
CREATE POLICY "Users can view their own achievements." ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements." ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, description, icon, color) VALUES
  ('Reading Comprehension', 'Test your reading comprehension skills', '📖', '#3B82F6'),
  ('Grammar', 'English grammar questions', '🔤', '#10B981'),
  ('Listening', 'Audio comprehension exercises', '🎧', '#8B5CF6'),
  ('Vocabulary', 'Build your vocabulary', '📚', '#F59E0B'),
  ('Writing', 'Practice writing skills', '✏️', '#EF4444');

-- Insert default achievements
INSERT INTO achievements (name, description, icon, condition_type, condition_value, points_reward) VALUES
  ('First Steps', 'Complete your first quiz', '🎯', 'quiz_completed', 1, 50),
  ('Quick Learner', 'Answer 10 questions correctly', '⚡', 'correct_answers', 10, 100),
  ('Grammar Master', 'Score 90% or higher in Grammar', '👑', 'category_accuracy_grammar', 90, 200),
  ('Reading Expert', 'Score 95% or higher in Reading', '📚', 'category_accuracy_reading', 95, 250),
  ('Streak Master', 'Get 5 questions right in a row', '🔥', 'streak', 5, 150),
  ('Perfect Score', 'Get 100% on any quiz', '💯', 'perfect_quiz', 1, 300),
  ('Dedicated Student', 'Complete 50 quizzes', '🎓', 'quiz_completed', 50, 500),
  ('Knowledge Seeker', 'Answer 1000 questions', '🧠', 'questions_answered', 1000, 1000);
