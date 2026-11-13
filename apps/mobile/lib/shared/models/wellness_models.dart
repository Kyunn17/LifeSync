import 'schedule_block_model.dart';
import 'user_model.dart';

class HealthLogModel {
  final String? id;
  final String date;
  final int sleepDurationMinutes;
  final int? sleepQuality;
  final int exerciseDurationMinutes;
  final int dailySteps;
  final int waterIntakeMl;
  final String mood;
  final int energyLevel;
  final int? restingHeartRate;
  final String? notes;

  HealthLogModel({
    this.id,
    required this.date,
    required this.sleepDurationMinutes,
    this.sleepQuality,
    required this.exerciseDurationMinutes,
    this.dailySteps = 0,
    this.waterIntakeMl = 0,
    this.mood = 'Calm',
    this.energyLevel = 75,
    this.restingHeartRate,
    this.notes,
  });

  factory HealthLogModel.fromJson(Map<String, dynamic> json) {
    return HealthLogModel(
      id: json['id']?.toString(),
      date: json['date']?.toString() ?? '',
      sleepDurationMinutes: ((json['sleepDurationMinutes'] ?? json['sleepMinutes']) as num?)?.toInt() ?? 0,
      sleepQuality: (json['sleepQuality'] as num?)?.toInt(),
      exerciseDurationMinutes: ((json['exerciseDurationMinutes'] ?? json['exerciseMinutes']) as num?)?.toInt() ?? 0,
      dailySteps: (json['dailySteps'] as num?)?.toInt() ?? 0,
      waterIntakeMl: (json['waterIntakeMl'] as num?)?.toInt() ?? 0,
      mood: json['mood']?.toString() ?? 'Calm',
      energyLevel: (json['energyLevel'] as num?)?.toInt() ?? 75,
      restingHeartRate: (json['restingHeartRate'] as num?)?.toInt(),
      notes: json['notes']?.toString(),
    );
  }
}

class DailyCheckinModel {
  final String id;
  final String date;
  final String mood;
  final int energyLevel;
  final String? reflection;

  DailyCheckinModel({
    required this.id,
    required this.date,
    required this.mood,
    required this.energyLevel,
    this.reflection,
  });

  factory DailyCheckinModel.fromJson(Map<String, dynamic> json) {
    return DailyCheckinModel(
      id: json['id']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      mood: json['mood']?.toString() ?? 'Calm',
      energyLevel: (json['energyLevel'] as num?)?.toInt() ?? 75,
      reflection: json['reflection']?.toString(),
    );
  }
}

class WellnessTipModel {
  final String id;
  final String title;
  final String category;
  final String content;
  final String? actionLabel;
  final String icon;

  WellnessTipModel({
    required this.id,
    required this.title,
    required this.category,
    required this.content,
    this.actionLabel,
    this.icon = 'lightbulb',
  });

  factory WellnessTipModel.fromJson(Map<String, dynamic> json) {
    return WellnessTipModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      category: json['category']?.toString() ?? 'General',
      content: json['content']?.toString() ?? '',
      actionLabel: json['actionLabel']?.toString(),
      icon: json['icon']?.toString() ?? 'lightbulb',
    );
  }
}

class DailyAnalyticsBundleModel {
  final String date;
  final bool hasAnyRecord;
  final int balanceScore;
  final UserProfileModel goals;
  final DailyScheduleSummaryModel schedule;
  final HealthLogModel wellness;
  final List<DailyCheckinModel> recentCheckins;
  final List<WellnessTipModel> tips;

  DailyAnalyticsBundleModel({
    required this.date,
    required this.hasAnyRecord,
    required this.balanceScore,
    required this.goals,
    required this.schedule,
    required this.wellness,
    required this.recentCheckins,
    required this.tips,
  });

  factory DailyAnalyticsBundleModel.fromJson(Map<String, dynamic> json) {
    final rawCheckins = json['recentCheckins'] as List? ?? [];
    final rawTips = json['tips'] as List? ?? [];

    return DailyAnalyticsBundleModel(
      date: json['date']?.toString() ?? '',
      hasAnyRecord: json['hasAnyRecord'] == true,
      balanceScore: (json['balanceScore'] as num?)?.toInt() ?? 0,
      goals: UserProfileModel.fromJson(json['goals'] as Map<String, dynamic>? ?? {}),
      schedule: DailyScheduleSummaryModel.fromJson(json['schedule'] as Map<String, dynamic>? ?? {}),
      wellness: HealthLogModel.fromJson(json['wellness'] as Map<String, dynamic>? ?? {}),
      recentCheckins: rawCheckins
          .map((c) => DailyCheckinModel.fromJson(c as Map<String, dynamic>))
          .toList(),
      tips: rawTips.map((t) => WellnessTipModel.fromJson(t as Map<String, dynamic>)).toList(),
    );
  }
}

