import 'activity_category_model.dart';

class ScheduleBlockModel {
  final String id;
  final String activityId;
  final String title;
  final String? description;
  final String date;
  final String startTime;
  final String endTime;
  final int durationMinutes;
  final bool crossesMidnight;
  final ActivityCategoryModel? category;

  ScheduleBlockModel({
    required this.id,
    required this.activityId,
    required this.title,
    this.description,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.durationMinutes,
    this.crossesMidnight = false,
    this.category,
  });

  factory ScheduleBlockModel.fromJson(Map<String, dynamic> json) {
    return ScheduleBlockModel(
      id: json['id']?.toString() ?? '',
      activityId: json['activityId']?.toString() ?? json['activity_id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      date: json['date']?.toString() ?? '',
      startTime: json['startTime']?.toString() ?? json['start_time']?.toString() ?? '',
      endTime: json['endTime']?.toString() ?? json['end_time']?.toString() ?? '',
      durationMinutes: (json['durationMinutes'] as num?)?.toInt() ??
          (json['duration_minutes'] as num?)?.toInt() ??
          0,
      crossesMidnight: json['crossesMidnight'] == true || json['crosses_midnight'] == true,
      category: json['category'] != null
          ? ActivityCategoryModel.fromJson(json['category'] as Map<String, dynamic>)
          : null,
    );
  }
}

class DailyScheduleSummaryModel {
  final String date;
  final int totalMinutesInDay;
  final int allocatedMinutes;
  final int remainingMinutes;
  final int allocatedPercentage;
  final List<ScheduleBlockModel> blocks;
  final List<CategoryDistributionModel> categoryDistribution;

  DailyScheduleSummaryModel({
    required this.date,
    this.totalMinutesInDay = 1440,
    required this.allocatedMinutes,
    required this.remainingMinutes,
    required this.allocatedPercentage,
    required this.blocks,
    required this.categoryDistribution,
  });

  factory DailyScheduleSummaryModel.fromJson(Map<String, dynamic> json) {
    final rawBlocks = json['blocks'] as List? ?? [];
    final rawDist = json['categoryDistribution'] as List? ?? [];

    return DailyScheduleSummaryModel(
      date: json['date']?.toString() ?? '',
      totalMinutesInDay: (json['totalMinutesInDay'] as num?)?.toInt() ?? 1440,
      allocatedMinutes: (json['allocatedMinutes'] as num?)?.toInt() ?? 0,
      remainingMinutes: (json['remainingMinutes'] as num?)?.toInt() ?? 1440,
      allocatedPercentage: (json['allocatedPercentage'] as num?)?.toInt() ?? 0,
      blocks: rawBlocks
          .map((b) => ScheduleBlockModel.fromJson(b as Map<String, dynamic>))
          .toList(),
      categoryDistribution: rawDist
          .map((d) => CategoryDistributionModel.fromJson(d as Map<String, dynamic>))
          .toList(),
    );
  }
}

class CategoryDistributionModel {
  final String categoryId;
  final String name;
  final String slug;
  final String colorHex;
  final int allocatedMinutes;
  final int targetMinutesPerDay;
  final int percentageOfDay;

  CategoryDistributionModel({
    required this.categoryId,
    required this.name,
    required this.slug,
    required this.colorHex,
    required this.allocatedMinutes,
    required this.targetMinutesPerDay,
    required this.percentageOfDay,
  });

  factory CategoryDistributionModel.fromJson(Map<String, dynamic> json) {
    return CategoryDistributionModel(
      categoryId: json['categoryId']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      colorHex: json['color']?.toString() ?? '#0D7A53',
      allocatedMinutes: (json['allocatedMinutes'] as num?)?.toInt() ?? 0,
      targetMinutesPerDay: (json['targetMinutesPerDay'] as num?)?.toInt() ?? 60,
      percentageOfDay: (json['percentageOfDay'] as num?)?.toInt() ?? 0,
    );
  }
}

