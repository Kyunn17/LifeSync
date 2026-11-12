import '../../../core/errors/failure.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_endpoints.dart';

class WeeklyAnalyticsModel {
  final int loggedDaysCount;
  final int avgSleepMinutes;
  final int avgExerciseMinutes;
  final int avgWaterIntakeMl;
  final int avgEnergyLevel;
  final int avgSteps;
  final List<DailyTrendPoint> dailySeries;
  final List<InsightItem> insights;

  WeeklyAnalyticsModel({
    required this.loggedDaysCount,
    required this.avgSleepMinutes,
    required this.avgExerciseMinutes,
    required this.avgWaterIntakeMl,
    required this.avgEnergyLevel,
    required this.avgSteps,
    required this.dailySeries,
    required this.insights,
  });

  factory WeeklyAnalyticsModel.fromJson(Map<String, dynamic> json) {
    final averages = json['averages'] as Map<String, dynamic>? ?? {};
    final rawSeries = json['dailySeries'] as List? ?? [];
    final rawInsights = json['insights'] as List? ?? [];

    return WeeklyAnalyticsModel(
      loggedDaysCount: (json['loggedDaysCount'] as num?)?.toInt() ?? 0,
      avgSleepMinutes: (averages['sleepMinutes'] as num?)?.toInt() ?? 0,
      avgExerciseMinutes: (averages['exerciseMinutes'] as num?)?.toInt() ?? 0,
      avgWaterIntakeMl: (averages['waterIntakeMl'] as num?)?.toInt() ?? 0,
      avgEnergyLevel: (averages['energyLevel'] as num?)?.toInt() ?? 0,
      avgSteps: (averages['dailySteps'] as num?)?.toInt() ?? 0,
      dailySeries: rawSeries.map((s) => DailyTrendPoint.fromJson(s as Map<String, dynamic>)).toList(),
      insights: rawInsights.map((i) => InsightItem.fromJson(i as Map<String, dynamic>)).toList(),
    );
  }
}

class DailyTrendPoint {
  final String date;
  final int sleepMinutes;
  final int exerciseMinutes;
  final int waterIntakeMl;
  final int energyLevel;

  DailyTrendPoint({
    required this.date,
    required this.sleepMinutes,
    required this.exerciseMinutes,
    required this.waterIntakeMl,
    required this.energyLevel,
  });

  factory DailyTrendPoint.fromJson(Map<String, dynamic> json) {
    return DailyTrendPoint(
      date: json['date']?.toString() ?? '',
      sleepMinutes: (json['sleepMinutes'] as num?)?.toInt() ?? 0,
      exerciseMinutes: (json['exerciseMinutes'] as num?)?.toInt() ?? 0,
      waterIntakeMl: (json['waterIntakeMl'] as num?)?.toInt() ?? 0,
      energyLevel: (json['energyLevel'] as num?)?.toInt() ?? 0,
    );
  }
}

class InsightItem {
  final String id;
  final String category;
  final String title;
  final String badge;
  final String description;
  final String metricLabel;
  final String metricValue;

  InsightItem({
    required this.id,
    required this.category,
    required this.title,
    required this.badge,
    required this.description,
    required this.metricLabel,
    required this.metricValue,
  });

  factory InsightItem.fromJson(Map<String, dynamic> json) {
    return InsightItem(
      id: json['id']?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      badge: json['badge']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      metricLabel: json['metricLabel']?.toString() ?? '',
      metricValue: json['metricValue']?.toString() ?? '',
    );
  }
}

class InsightsRepository {
  final ApiClient apiClient;

  InsightsRepository({required this.apiClient});

  Future<WeeklyAnalyticsModel> getWeeklyAnalytics(String endDate) async {
    try {
      final response = await apiClient.dio.get(
        ApiEndpoints.weeklyAnalytics,
        queryParameters: {'date': endDate},
      );

      final data = response.data?['data'] as Map<String, dynamic>?;
      if (data == null) throw const ServerFailure('Tidak ada data analitik');

      return WeeklyAnalyticsModel.fromJson(data);
    } catch (e) {
      throw ServerFailure('Gagal memuat analitik mingguan: $e');
    }
  }
}

