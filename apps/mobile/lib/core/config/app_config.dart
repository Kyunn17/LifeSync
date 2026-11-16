class AppConfig {
  static const String appName = 'LifeSync Wellness';
  static const String appTagline = 'Your life, in better balance.';

  // Default to the production Vercel API, or override with --dart-define=API_BASE_URL=...
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://life-sync-uizr-six.vercel.app',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
}

