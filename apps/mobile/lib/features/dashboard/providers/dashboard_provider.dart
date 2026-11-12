import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../shared/models/wellness_models.dart';
import '../data/dashboard_repository.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return DashboardRepository(apiClient: apiClient);
});

final selectedDateProvider = StateProvider<String>((ref) {
  final now = DateTime.now();
  return DateFormat('yyyy-MM-dd').format(now);
});

final dailyAnalyticsProvider = FutureProvider.autoDispose<DailyAnalyticsBundleModel>((ref) async {
  final repository = ref.watch(dashboardRepositoryProvider);
  final date = ref.watch(selectedDateProvider);
  return await repository.getDailyAnalytics(date);
});

