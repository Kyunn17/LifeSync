import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../../shared/models/wellness_models.dart';
import '../data/wellness_repository.dart';

final wellnessRepositoryProvider = Provider<WellnessRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return WellnessRepository(apiClient: apiClient);
});

final todayHealthLogProvider = FutureProvider.autoDispose<HealthLogModel?>((ref) async {
  final repository = ref.watch(wellnessRepositoryProvider);
  final date = ref.watch(selectedDateProvider);
  return await repository.getHealthLog(date);
});

