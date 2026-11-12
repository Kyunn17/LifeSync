import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../data/insights_repository.dart';

final insightsRepositoryProvider = Provider<InsightsRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return InsightsRepository(apiClient: apiClient);
});

final weeklyAnalyticsProvider = FutureProvider.autoDispose<WeeklyAnalyticsModel>((ref) async {
  final repository = ref.watch(insightsRepositoryProvider);
  final date = ref.watch(selectedDateProvider);
  return await repository.getWeeklyAnalytics(date);
});

