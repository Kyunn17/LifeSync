import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../../shared/models/activity_category_model.dart';
import '../../../shared/models/schedule_block_model.dart';
import '../data/planner_repository.dart';

final plannerRepositoryProvider = Provider<PlannerRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return PlannerRepository(apiClient: apiClient);
});

final categoriesProvider = FutureProvider<List<ActivityCategoryModel>>((ref) async {
  final repository = ref.watch(plannerRepositoryProvider);
  return await repository.getCategories();
});

final scheduleSummaryProvider = FutureProvider.autoDispose<DailyScheduleSummaryModel>((ref) async {
  final repository = ref.watch(plannerRepositoryProvider);
  final date = ref.watch(selectedDateProvider);
  return await repository.getScheduleForDate(date);
});

