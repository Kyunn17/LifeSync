import '../../../core/errors/failure.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/network/api_response.dart';
import '../../../shared/models/wellness_models.dart';

class DashboardRepository {
  final ApiClient apiClient;

  DashboardRepository({required this.apiClient});

  Future<DailyAnalyticsBundleModel> getDailyAnalytics(String date) async {
    try {
      final response = await apiClient.dio.get(
        ApiEndpoints.dailyAnalytics,
        queryParameters: {'date': date},
      );

      final apiRes = ApiResponse<DailyAnalyticsBundleModel>.fromJson(
        response.data as Map<String, dynamic>,
        (json) => DailyAnalyticsBundleModel.fromJson(json as Map<String, dynamic>),
      );

      if (!apiRes.success || apiRes.data == null) {
        throw const ServerFailure('Gagal memuat data dashboard harian');
      }

      return apiRes.data!;
    } catch (e) {
      if (e is Failure) rethrow;
      throw ServerFailure('Gagal memuat data dashboard: $e');
    }
  }

  Future<void> addWater(String date, int amountMl) async {
    try {
      await apiClient.dio.post(
        ApiEndpoints.water,
        data: {
          'date': date,
          'amountMl': amountMl,
        },
      );
    } catch (e) {
      throw ServerFailure('Gagal mencatat air minum: $e');
    }
  }

  Future<void> logCheckin({
    required String date,
    required String mood,
    required int energyLevel,
    String? reflection,
  }) async {
    try {
      await apiClient.dio.post(
        ApiEndpoints.checkins,
        data: {
          'date': date,
          'mood': mood,
          'energyLevel': energyLevel,
          if (reflection != null && reflection.isNotEmpty) 'reflection': reflection,
        },
      );
    } catch (e) {
      throw ServerFailure('Gagal menyimpan check-in harian: $e');
    }
  }
}

