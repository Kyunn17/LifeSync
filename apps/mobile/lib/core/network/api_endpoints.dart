class ApiEndpoints {
  // Auth
  static const String signIn = '/api/auth/sign-in/email';
  static const String signUp = '/api/auth/sign-up/email';
  static const String signOut = '/api/auth/sign-out';
  static const String session = '/api/auth/get-session';
  static const String verifyCode = '/api/verify-code';
  static const String resendCode = '/api/resend-code';

  // User
  static const String me = '/api/users/me';

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
  static const String nutritionCustomFoods = '/api/nutrition/custom-foods';
  static const String nutritionGoal = '/api/nutrition/goal';

  // Analytics
  static const String dailyAnalytics = '/api/analytics/daily';
  static const String weeklyAnalytics = '/api/analytics/weekly';
  static const String monthlyAnalytics = '/api/analytics/monthly';
}

