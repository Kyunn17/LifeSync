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

  Future<ScheduleBlockModel> updateSchedule({
    required String id,
    String? title,
    String? activityId,
    String? date,
    String? startTime,
    String? endTime,
    String? description,
  }) async {
    try {
      final response = await apiClient.dio.patch(
        '${ApiEndpoints.schedules}/$id',
        data: {
          if (title != null) 'title': title.trim(),
          'activityId': ?activityId,
          'date': ?date,
          'startTime': ?startTime,
          'endTime': ?endTime,
          if (description != null) 'description': description.trim(),
        },
      );

      final apiRes = ApiResponse<ScheduleBlockModel>.fromJson(
        response.data as Map<String, dynamic>,
        (json) => ScheduleBlockModel.fromJson(json as Map<String, dynamic>),
      );

      if (!apiRes.success || apiRes.data == null) {
        throw ServerFailure(apiRes.error?.message ?? 'Gagal memperbarui jadwal');
      }

      return apiRes.data!;
    } catch (e) {
      if (e is Failure) rethrow;
      throw ServerFailure('Gagal memperbarui jadwal: $e');
    }
  }

  Future<void> splitSchedule(ScheduleBlockModel block) async {
    if (block.durationMinutes < 30) {
      throw const ServerFailure('Jadwal minimal 30 menit untuk dibagi.');
    }
    final half = (block.durationMinutes / 2).floor();
    final midMin = block.startMinutes + half;
    final h = (midMin ~/ 60).toString().padLeft(2, '0');
    final m = (midMin % 60).toString().padLeft(2, '0');
    final midTimeStr = '$h:$m';

    // 1. Update first half
    await updateSchedule(
      id: block.id,
      title: '${block.title} (Bagian 1)',
      endTime: midTimeStr,
    );

    // 2. Create second half
    await createSchedule(
      title: '${block.title} (Bagian 2)',
      activityId: block.activityId,
      date: block.date,
      startTime: midTimeStr,
      endTime: block.endTime,
      description: block.description,
    );
  }

  Future<int> copyYesterdaySchedule(String targetDate) async {
    final dt = DateTime.parse(targetDate);
    final yesterday = dt.subtract(const Duration(days: 1));
    final yesterdayStr =
        "${yesterday.year}-${yesterday.month.toString().padLeft(2, '0')}-${yesterday.day.toString().padLeft(2, '0')}";

    final yesterdaySummary = await getScheduleForDate(yesterdayStr);
    if (yesterdaySummary.blocks.isEmpty) return 0;

    int copied = 0;
    for (final block in yesterdaySummary.blocks) {
      try {
        await createSchedule(
          title: block.title,
          activityId: block.activityId,
          date: targetDate,
          startTime: block.startTime,
          endTime: block.endTime,
          description: block.description,
        );
        copied++;
      } catch (_) {}
    }
    return copied;
  }

  Future<int> applyRoutineTemplate(
    String date,
    String type,
    List<ActivityCategoryModel> categories,
  ) async {
    String findCatId(String keyword) {
      final found = categories.firstWhere(
        (c) =>
            c.slug.toLowerCase().contains(keyword.toLowerCase()) ||
            c.name.toLowerCase().contains(keyword.toLowerCase()),
        orElse: () => categories.isNotEmpty
            ? categories.first
            : ActivityCategoryModel(
                id: '',
                name: '',
                slug: '',
                colorHex: '',
                bgColorHex: '',
                icon: '',
              ),
      );
      return found.id;
    }

    final sleepCat = findCatId('sleep');
    final workCat = findCatId('work');
    final mealCat = findCatId('meal');
    final exerciseCat = findCatId('exercise');
    final personalCat = findCatId('personal');

    final List<Map<String, String>> templateBlocks = type == 'workday'
        ? [
            {'title': 'Rutinitas Pagi & Sarapan', 'startTime': '07:00', 'endTime': '08:30', 'cat': mealCat},
            {'title': 'Fokus Kerja / Belajar', 'startTime': '09:00', 'endTime': '12:00', 'cat': workCat},
            {'title': 'Makan Siang & Reset', 'startTime': '12:00', 'endTime': '13:00', 'cat': mealCat},
            {'title': 'Pekerjaan Sore & Tugas', 'startTime': '13:30', 'endTime': '17:00', 'cat': workCat},
            {'title': 'Olahraga & Gerak', 'startTime': '17:30', 'endTime': '18:30', 'cat': exerciseCat},
            {'title': 'Makan Malam & Santai', 'startTime': '19:00', 'endTime': '20:30', 'cat': personalCat},
            {'title': 'Tidur Malam Nyenyak', 'startTime': '22:30', 'endTime': '06:30', 'cat': sleepCat},
          ]
        : [
            {'title': 'Pagi Santai & Sarapan', 'startTime': '08:00', 'endTime': '09:30', 'cat': mealCat},
            {'title': 'Jalan Pagi / Olahraga', 'startTime': '10:00', 'endTime': '11:30', 'cat': exerciseCat},
            {'title': 'Waktu Hobi & Keluarga', 'startTime': '13:00', 'endTime': '16:00', 'cat': personalCat},
            {'title': 'Makan Malam Akhir Pekan', 'startTime': '18:30', 'endTime': '20:00', 'cat': mealCat},
            {'title': 'Tidur Pemulihan Akhir Pekan', 'startTime': '23:00', 'endTime': '07:30', 'cat': sleepCat},
          ];

    int created = 0;
    for (final b in templateBlocks) {
      if (b['cat']!.isEmpty) continue;
      try {
        await createSchedule(
          title: b['title']!,
          activityId: b['cat']!,
          date: date,
          startTime: b['startTime']!,
          endTime: b['endTime']!,
        );
        created++;
      } catch (_) {}
    }
    return created;
  }
}
