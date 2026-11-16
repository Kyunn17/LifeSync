import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../shared/models/user_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../insights/providers/insights_provider.dart';
import '../../nutrition/providers/nutrition_provider.dart';

class WeightLogModel {
  final String id;
  final String date;
  final double weightKg;
  final double? previousWeightKg;
  final double deltaKg;
  final bool isAnomaly;
  final String? anomalyNote;
  final String? notes;

  const WeightLogModel({
    required this.id,
    required this.date,
    required this.weightKg,
    this.previousWeightKg,
    this.deltaKg = 0.0,
    this.isAnomaly = false,
    this.anomalyNote,
    this.notes,
  });

  factory WeightLogModel.fromJson(Map<String, dynamic> json) {
    return WeightLogModel(
      id: json['id']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      weightKg: (json['weightKg'] as num?)?.toDouble() ?? 0.0,
      previousWeightKg: (json['previousWeightKg'] as num?)?.toDouble(),
      deltaKg: (json['deltaKg'] as num?)?.toDouble() ?? 0.0,
      isAnomaly: json['isAnomaly'] == true,
      anomalyNote: json['anomalyNote']?.toString(),
      notes: json['notes']?.toString(),
    );
  }
}

class WeightEvaluationModel {
  final String fitnessGoal;
  final double? currentWeightKg;
  final double? baselineWeightKg;
  final double? weeklyDeltaKg;
  final String status;
  final String badge;
  final String summary;
  final int daysTracked;

  const WeightEvaluationModel({
    this.fitnessGoal = 'MAINTENANCE',
    this.currentWeightKg,
    this.baselineWeightKg,
    this.weeklyDeltaKg,
    this.status = 'INSUFFICIENT_DATA',
    this.badge = 'Menunggu Data Mingguan',
    this.summary =
        'Catat berat badan secara rutin minimal 2 kali seminggu untuk melihat evaluasi progres diet Anda.',
    this.daysTracked = 0,
  });

  factory WeightEvaluationModel.fromJson(Map<String, dynamic> json) {
    return WeightEvaluationModel(
      fitnessGoal: json['fitnessGoal']?.toString() ?? 'MAINTENANCE',
      currentWeightKg: (json['currentWeightKg'] as num?)?.toDouble(),
      baselineWeightKg: (json['baselineWeightKg'] as num?)?.toDouble(),
      weeklyDeltaKg: (json['weeklyDeltaKg'] as num?)?.toDouble(),
      status: json['status']?.toString() ?? 'INSUFFICIENT_DATA',
      badge: json['badge']?.toString() ?? 'Evaluasi Mingguan',
      summary: json['summary']?.toString() ?? '',
      daysTracked: (json['daysTracked'] as num?)?.toInt() ?? 0,
    );
  }
}

class WeightTrackerData {
  final List<WeightLogModel> logs;
  final WeightEvaluationModel evaluation;

  const WeightTrackerData({
    this.logs = const [],
    this.evaluation = const WeightEvaluationModel(),
  });
}

class WeightAnomalyException implements Exception {
  final double previousWeightKg;
  final double newWeightKg;
  final double deltaKg;
  final String message;

  const WeightAnomalyException({
    required this.previousWeightKg,
    required this.newWeightKg,
    required this.deltaKg,
    required this.message,
  });
}

class WeightNotifier extends StateNotifier<AsyncValue<WeightTrackerData>> {
  final Ref _ref;
  final ApiClient _apiClient;

  WeightNotifier(this._ref, this._apiClient)
      : super(const AsyncValue.loading()) {
    fetchWeightHistory();
  }

  Future<void> fetchWeightHistory() async {
    try {
      final res = await _apiClient.dio.get(ApiEndpoints.userWeight);
      final data = res.data?['data'];
      if (data is Map<String, dynamic>) {
        final rawLogs = data['logs'] as List? ?? [];
        final logs = rawLogs
            .map((e) => WeightLogModel.fromJson(e as Map<String, dynamic>))
            .toList();
        final evalJson = data['evaluation'] as Map<String, dynamic>? ?? {};
        state = AsyncValue.data(
          WeightTrackerData(
            logs: logs,
            evaluation: WeightEvaluationModel.fromJson(evalJson),
          ),
        );
      } else {
        state = const AsyncValue.data(WeightTrackerData());
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> logWeight({
    required String date,
    required double weightKg,
    bool confirmAnomaly = false,
    String? anomalyNote,
    String? notes,
  }) async {
    try {
      final res = await _apiClient.dio.post(
        ApiEndpoints.userWeight,
        data: {
          'date': date,
          'weightKg': weightKg,
          'confirmAnomaly': confirmAnomaly,
          if (anomalyNote != null && anomalyNote.trim().isNotEmpty)
            'anomalyNote': anomalyNote.trim(),
          if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
        },
      );

      final data = res.data?['data'];
      if (data is Map<String, dynamic>) {
        final rawLogs = data['logs'] as List? ?? [];
        final logs = rawLogs
            .map((e) => WeightLogModel.fromJson(e as Map<String, dynamic>))
            .toList();
        final evalJson = data['evaluation'] as Map<String, dynamic>? ?? {};
        state = AsyncValue.data(
          WeightTrackerData(
            logs: logs,
            evaluation: WeightEvaluationModel.fromJson(evalJson),
          ),
        );

        if (data['user'] is Map<String, dynamic>) {
          final updatedUser =
              UserModel.fromJson(data['user'] as Map<String, dynamic>);
          _ref.read(authStateProvider.notifier).setUser(updatedUser);
          final calGoal = updatedUser.profile?.dailyCalorieGoal;
          if (calGoal != null) {
            await _ref
                .read(dailyNutritionProvider.notifier)
                .updateCalorieGoal(calGoal);
          }
        } else {
          await _ref.read(authStateProvider.notifier).refreshProfile();
        }
      } else {
        await fetchWeightHistory();
      }

      _ref.invalidate(dailyAnalyticsProvider);
      _ref.invalidate(weeklyAnalyticsProvider);
    } on DioException catch (e) {
      final errObj = e.response?.data?['error'];
      if (e.response?.statusCode == 409 &&
          errObj is Map<String, dynamic> &&
          errObj['code'] == 'WEIGHT_ANOMALY_CONFIRMATION_REQUIRED') {
        final details = errObj['details'] as Map<String, dynamic>? ?? {};
        throw WeightAnomalyException(
          previousWeightKg:
              (details['previousWeightKg'] as num?)?.toDouble() ?? weightKg,
          newWeightKg:
              (details['newWeightKg'] as num?)?.toDouble() ?? weightKg,
          deltaKg: (details['deltaKg'] as num?)?.toDouble() ?? 0.0,
          message: errObj['message']?.toString() ??
              'Perubahan berat badan >= 10 kg terdeteksi.',
        );
      }
      final msg = errObj?['message']?.toString() ??
          e.message ??
          'Gagal mencatat berat badan.';
      throw Exception(msg);
    }
  }
}

final weightTrackerProvider =
    StateNotifierProvider<WeightNotifier, AsyncValue<WeightTrackerData>>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return WeightNotifier(ref, apiClient);
});
