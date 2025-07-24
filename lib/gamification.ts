import { Profile, LevelInfo, QuizResult, Achievement } from './types'

// Level calculation
export function calculateLevel(experiencePoints: number): number {
  // Level formula: level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(experiencePoints / 100)) + 1
}

export function getXPForLevel(level: number): number {
  // XP needed for level: (level - 1)^2 * 100
  return Math.pow(level - 1, 2) * 100
}

export function getLevelInfo(experiencePoints: number): LevelInfo {
  const currentLevel = calculateLevel(experiencePoints)
  const currentLevelXP = getXPForLevel(currentLevel)
  const nextLevelXP = getXPForLevel(currentLevel + 1)
  const progress = ((experiencePoints - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100

  return {
    level: currentLevel,
    currentLevel,
    currentXP: experiencePoints,
    nextLevelXP,
    xpToNext: nextLevelXP - experiencePoints,
    progress: Math.min(100, Math.max(0, progress))
  }
}

// Experience calculation
export function calculateExperienceGain(
  correctAnswers: number,
  totalQuestions: number,
  timeTaken: number,
  difficultyMultiplier: number = 1
): number {
  const accuracy = correctAnswers / totalQuestions
  const baseXP = correctAnswers * 10
  const accuracyBonus = accuracy >= 0.8 ? baseXP * 0.5 : 0
  const speedBonus = timeTaken < 60 ? baseXP * 0.2 : 0
  const difficultyBonus = baseXP * (difficultyMultiplier - 1)

  return Math.floor(baseXP + accuracyBonus + speedBonus + difficultyBonus)
}

// Achievement checking
export function checkAchievements(
  userStats: any,
  quizResult: QuizResult,
  userAchievements: Achievement[]
): Achievement[] {
  const earnedAchievements: Achievement[] = []
  const achievementIds = userAchievements.map(ua => ua.id)

  // First Steps - Complete first quiz
  if (!achievementIds.includes('first-steps') && userStats.quizzesCompleted === 1) {
    earnedAchievements.push({
      id: 'first-steps',
      name: 'First Steps',
      description: 'Complete your first quiz',
      icon: '🎯',
      condition_type: 'quiz_completed',
      condition_value: 1,
      points_reward: 50,
      created_at: new Date().toISOString()
    })
  }

  // Perfect Score
  if (!achievementIds.includes('perfect-score') && quizResult.correctAnswers === quizResult.totalQuestions) {
    earnedAchievements.push({
      id: 'perfect-score',
      name: 'Perfect Score',
      description: 'Get 100% on any quiz',
      icon: '💯',
      condition_type: 'perfect_quiz',
      condition_value: 1,
      points_reward: 300,
      created_at: new Date().toISOString()
    })
  }

  // Quick Learner - 10 correct answers total
  if (!achievementIds.includes('quick-learner') && userStats.correctAnswers >= 10) {
    earnedAchievements.push({
      id: 'quick-learner',
      name: 'Quick Learner',
      description: 'Answer 10 questions correctly',
      icon: '⚡',
      condition_type: 'correct_answers',
      condition_value: 10,
      points_reward: 100,
      created_at: new Date().toISOString()
    })
  }

  return earnedAchievements
}

// Rank calculation
export const RANK_THRESHOLDS = [
  { name: 'Beginner', minXP: 0, color: '#9CA3AF', icon: '🌱' },
  { name: 'Novice', minXP: 500, color: '#10B981', icon: '🌿' },
  { name: 'Apprentice', minXP: 1500, color: '#3B82F6', icon: '⭐' },
  { name: 'Expert', minXP: 3500, color: '#8B5CF6', icon: '💎' },
  { name: 'Master', minXP: 7500, color: '#F59E0B', icon: '👑' },
  { name: 'Grandmaster', minXP: 15000, color: '#EF4444', icon: '🏆' },
]

export function getUserRank(experiencePoints: number) {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (experiencePoints >= RANK_THRESHOLDS[i].minXP) {
      return RANK_THRESHOLDS[i]
    }
  }
  return RANK_THRESHOLDS[0]
}

// Streak calculation
export function calculateStreak(recentQuizzes: any[]): number {
  let streak = 0
  for (let i = 0; i < recentQuizzes.length; i++) {
    const accuracy = recentQuizzes[i].correct_answers / recentQuizzes[i].total_questions
    if (accuracy >= 0.7) { // 70% threshold for streak
      streak++
    } else {
      break
    }
  }
  return streak
}

// Points calculation
export function calculateQuizScore(
  correctAnswers: number,
  totalQuestions: number,
  timeTaken: number,
  averageDifficulty: number = 1
): number {
  const accuracy = correctAnswers / totalQuestions
  const basePoints = correctAnswers * 100
  const accuracyBonus = accuracy >= 0.9 ? basePoints * 0.5 : accuracy >= 0.8 ? basePoints * 0.25 : 0
  const speedBonus = timeTaken < 120 ? basePoints * 0.1 : 0
  const difficultyBonus = basePoints * (averageDifficulty - 1) * 0.2

  return Math.floor(basePoints + accuracyBonus + speedBonus + difficultyBonus)
}

// Time formatting
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Progress animations
export function animateNumber(
  start: number,
  end: number,
  duration: number,
  callback: (value: number) => void
) {
  const startTime = Date.now()
  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easeOutQuart = 1 - Math.pow(1 - progress, 4)
    const current = Math.floor(start + (end - start) * easeOutQuart)
    callback(current)
    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }
  requestAnimationFrame(animate)
}
