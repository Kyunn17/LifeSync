import '../../../core/errors/failure.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/network/api_response.dart';
import '../../../shared/models/activity_category_model.dart';
import '../../../shared/models/schedule_block_model.dart';

class PlannerRepository {
  final ApiClient apiClient;

  PlannerRepository({required this.apiClient});

  Future<DailyScheduleSummaryModel> getScheduleForDate(String date) async {
    try {
      final response = await apiClient.dio.get(
        ApiEndpoints.schedules,
        queryParameters: {'date': date},
      );

      final apiRes = ApiResponse<DailyScheduleSummaryModel>.fromJson(
        response.data as Map<String, dynamic>,
        (json) => DailyScheduleSummaryModel.fromJson(json as Map<String, dynamic>),
      );

      if (!apiRes.success || apiRes.data == null) {
        throw const ServerFailure('Gagal memuat jadwal harian');
      }

      return apiRes.data!;
    } catch (e) {
      if (e is Failure) rethrow;
      throw ServerFailure('Gagal memuat jadwal: $e');
    }
  }

  Future<List<ActivityCategoryModel>> getCategories() async {
    try {
      final response = await apiClient.dio.get(ApiEndpoints.activities);
      final rawList = response.data?['data'] as List? ?? [];
      return rawList
          .map((cat) => ActivityCategoryModel.fromJson(cat as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw ServerFailure('Gagal memuat kategori aktivitas: $e');
    }
  }

  Future<ScheduleBlockModel> createSchedule({
    required String title,
    required String activityId,
    required String date,
    required String startTime,
    required String endTime,
    String? description,
  }) async {
    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.schedules,
        data: {
          'title': title.trim(),
          'activityId': activityId,
          'date': date,
          'startTime': startTime,
          'endTime': endTime,
          if (description != null && description.isNotEmpty) 'description': description.trim(),
        },
      );

      final apiRes = ApiResponse<ScheduleBlockModel>.fromJson(
        response.data as Map<String, dynamic>,
        (json) => ScheduleBlockModel.fromJson(json as Map<String, dynamic>),
      );

      if (!apiRes.success || apiRes.data == null) {
        throw ServerFailure(apiRes.error?.message ?? 'Gagal membuat jadwal');
      }

      return apiRes.data!;
    } catch (e) {
      if (e is Failure) rethrow;
      throw ServerFailure('Jadwal bentrok atau tidak valid.');
    }
  }

  Future<void> deleteSchedule(String id) async {
    try {
      await apiClient.dio.delete('${ApiEndpoints.schedules}/$id');
    } catch (e) {
      throw ServerFailure('Gagal menghapus jadwal: $e');
    }
  }
}

