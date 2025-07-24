export interface User {
  id: string
  name: string
  email: string
  role: "student" | "admin"
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  description?: string
  total_questions: number
  created_at: string
  updated_at: string
}

export interface QuestionSet {
  id: string
  category_id: string
  title: string
  description?: string
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          level: number
          experience_points: number
          total_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          level?: number
          experience_points?: number
          total_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          level?: number
          experience_points?: number
          total_score?: number
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          category_id: string
          question_text: string
          choices: string[]
          correct_answer: number
          explanation: string | null
          difficulty_level: number
          points: number
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          question_text: string
          choices: string[]
          correct_answer: number
          explanation?: string | null
          difficulty_level?: number
          points?: number
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          question_text?: string
          choices?: string[]
          correct_answer?: number
          explanation?: string | null
          difficulty_level?: number
          points?: number
          created_at?: string
        }
      }
      quiz_sessions: {
        Row: {
          id: string
          user_id: string
          category_id: string
          total_questions: number
          correct_answers: number
          score: number
          time_taken: number
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          total_questions: number
          correct_answers: number
          score: number
          time_taken: number
          completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          total_questions?: number
          correct_answers?: number
          score?: number
          time_taken?: number
          completed_at?: string
          created_at?: string
        }
      }
      achievements: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          condition_type: string
          condition_value: number
          points_reward: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          condition_type: string
          condition_value: number
          points_reward: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          condition_type?: string
          condition_value?: number
          points_reward?: number
          created_at?: string
        }
      }
      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          earned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          achievement_id: string
          earned_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          achievement_id?: string
          earned_at?: string
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type CategoryDB = Database['public']['Tables']['categories']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type QuizSession = Database['public']['Tables']['quiz_sessions']['Row']
export type Achievement = Database['public']['Tables']['achievements']['Row']
export type UserAchievement = Database['public']['Tables']['user_achievements']['Row']

// Alias for compatibility
export type UserProfile = Profile

// Gamification types
export interface UserStats {
  totalQuizzes: number
  totalQuestions: number
  correctAnswers: number
  averageScore: number
  currentStreak: number
  longestStreak: number
  accuracyRate: number
}

export interface LevelInfo {
  level: number
  currentLevel: number
  currentXP: number
  nextLevelXP: number
  xpToNext: number
  progress: number
}

export interface QuizResult {
  score: number
  correctAnswers: number
  totalQuestions: number
  timeTaken: number
  experienceGained: number
  levelUp: boolean
  newAchievements: Achievement[]
}

export interface StudySession {
  id: string
  user_id: string
  question_set_id: string
  score: number
  correct_count: number
  total_questions: number
  time_taken?: number
  quiz_mode: "timed" | "all_questions" | "random"
  created_at: string
  question_set?: QuestionSet
}

export interface Badge {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  condition_type?: string
  condition_value?: number
  created_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}

export interface PDFUpload {
  id: string
  category_id: string
  file_name: string
  file_url: string
  file_type: "questions" | "answers"
  file_size?: number
  uploaded_by: string
  is_processed: boolean
  created_at: string
}

export interface ParsedQuestion {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  option_e: string
  correct_answer?: "A" | "B" | "C" | "D" | "E"
}

export interface ParsedAnswers {
  [questionNumber: string]: "A" | "B" | "C" | "D" | "E"
}

export interface QuizState {
  questions: Question[]
  currentIndex: number
  answers: Record<string, string>
  startTime: number
  mode: "timed" | "all_questions" | "random"
  timeLimit?: number
}
