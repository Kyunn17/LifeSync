import '../../../core/errors/failure.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../shared/models/wellness_models.dart';

class WellnessRepository {
  final ApiClient apiClient;

  WellnessRepository({required this.apiClient});

  Future<HealthLogModel?> getHealthLog(String date) async {
    try {
      final response = await apiClient.dio.get(
        ApiEndpoints.health,
        queryParameters: {'date': date},
      );

      final rawList = response.data?['data'] as List? ?? [];
      if (rawList.isEmpty) return null;

      return HealthLogModel.fromJson(rawList.first as Map<String, dynamic>);
    } catch (e) {
      throw ServerFailure('Gagal memuat catatan kesehatan: $e');
    }
  }

  Future<void> upsertHealthLog({
    required String date,
    required int sleepDurationMinutes,
    int? sleepQuality,
    required int exerciseDurationMinutes,
    int dailySteps = 0,
    int waterIntakeMl = 0,
    String mood = 'Calm',
    int energyLevel = 75,
    String? notes,
  }) async {
    try {
      await apiClient.dio.post(
        ApiEndpoints.health,
        data: {
          'date': date,
          'sleepDurationMinutes': sleepDurationMinutes,
          'sleepQuality': sleepQuality ?? 85,
          'exerciseDurationMinutes': exerciseDurationMinutes,
          'dailySteps': dailySteps,
          'waterIntakeMl': waterIntakeMl,
          'mood': mood,
          'energyLevel': energyLevel,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        },
      );
    } catch (e) {
      throw ServerFailure('Gagal menyimpan log kesehatan: $e');
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
      throw ServerFailure('Gagal mencatat mood harian: $e');
    }
  }
}

