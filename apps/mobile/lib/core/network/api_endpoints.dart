class ApiEndpoints {
  // Auth
  static const String signIn = '/api/auth/sign-in/email';
  static const String signUp = '/api/auth/sign-up/email';
  static const String signOut = '/api/auth/sign-out';
  static const String session = '/api/auth/get-session';
  static const String verifyCode = '/api/verify-code';
  static const String resendCode = '/api/resend-code';
  static const String forgotPasswordRequest = '/api/forgot-password/request';
  static const String forgotPasswordVerifyOtp =
      '/api/forgot-password/verify-otp';
  static const String forgotPasswordReset = '/api/forgot-password/reset';

  // User
  static const String me = '/api/users/me';
  static const String onboarding = '/api/users/me/onboarding';
  static const String recalculateGoals = '/api/users/me/recalculate-goals';
  static const String userWeight = '/api/users/me/weight';

  // Activities & Schedules
  static const String activities = '/api/activities';
  static const String schedules = '/api/schedules';

  // Wellness
  static const String health = '/api/health';
  static const String checkins = '/api/checkins';
  static const String water = '/api/water';
  static const String tips = '/api/tips';

  // Nutrition
  static const String nutritionMeals = '/api/nutrition/meals';
  static const String nutritionAiScan = '/api/nutrition/meals/ai-scan';
  static const String nutritionCustomFoods = '/api/nutrition/custom-foods';
  static const String nutritionGoal = '/api/nutrition/goal';

  // Analytics
  static const String dailyAnalytics = '/api/analytics/daily';
  static const String weeklyAnalytics = '/api/analytics/weekly';
  static const String monthlyAnalytics = '/api/analytics/monthly';
}

