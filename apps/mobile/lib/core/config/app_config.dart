class AppConfig {
  static const String appName = 'LifeSync Wellness';
  static const String appTagline = 'Your life, in better balance.';

  // Default to the production Railway API, or override with --dart-define=API_BASE_URL=...
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://lifesyncapi-production.up.railway.app',
  );

  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
}

