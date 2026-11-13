import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../insights/providers/insights_provider.dart';
import 'wellness_provider.dart';

class PushupStatsState {
  final int currentStreak;
  final int todayReps;
  final int totalAllTimeReps;
  final int bestSessionReps;
  final String? lastWorkoutDate;
  final bool isLoading;

  const PushupStatsState({
    this.currentStreak = 0,
    this.todayReps = 0,
    this.totalAllTimeReps = 0,
    this.bestSessionReps = 0,
    this.lastWorkoutDate,
    this.isLoading = false,
  });

  PushupStatsState copyWith({
    int? currentStreak,
    int? todayReps,
    int? totalAllTimeReps,
    int? bestSessionReps,
    String? lastWorkoutDate,
    bool? isLoading,
  }) {
    return PushupStatsState(
      currentStreak: currentStreak ?? this.currentStreak,
      todayReps: todayReps ?? this.todayReps,
      totalAllTimeReps: totalAllTimeReps ?? this.totalAllTimeReps,
      bestSessionReps: bestSessionReps ?? this.bestSessionReps,
      lastWorkoutDate: lastWorkoutDate ?? this.lastWorkoutDate,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class PushupStatsNotifier extends StateNotifier<PushupStatsState> {
  final Ref _ref;

  static const _keyStreak = 'lifesync_pushup_streak';
  static const _keyLastDate = 'lifesync_pushup_last_date';
  static const _keyTodayReps = 'lifesync_pushup_today_reps';
  static const _keyTotalAllTime = 'lifesync_pushup_total_alltime';
  static const _keyBestSession = 'lifesync_pushup_best_session';

  PushupStatsNotifier(this._ref) : super(const PushupStatsState()) {
    loadStats();
  }

  String get _todayStr => DateFormat('yyyy-MM-dd').format(DateTime.now());
  String get _yesterdayStr =>
      DateFormat('yyyy-MM-dd').format(DateTime.now().subtract(const Duration(days: 1)));

  Future<void> loadStats() async {
    final prefs = await SharedPreferences.getInstance();
    final lastDate = prefs.getString(_keyLastDate);
    int streak = prefs.getInt(_keyStreak) ?? 0;
    int todayReps = prefs.getInt(_keyTodayReps) ?? 0;
    final totalAllTime = prefs.getInt(_keyTotalAllTime) ?? 0;
    final bestSession = prefs.getInt(_keyBestSession) ?? 0;

    // Reset todayReps if it's a new day
    if (lastDate != _todayStr) {
      todayReps = 0;
      // Reset streak if user missed yesterday
      if (lastDate != null && lastDate != _yesterdayStr) {
        streak = 0;
      }
    }

    state = PushupStatsState(
      currentStreak: streak,
      todayReps: todayReps,
      totalAllTimeReps: totalAllTime,
      bestSessionReps: bestSession,
      lastWorkoutDate: lastDate,
    );
  }

  Future<void> recordSession({
    required int reps,
    required int durationSeconds,
  }) async {
    if (reps <= 0) return;

    state = state.copyWith(isLoading: true);
    final prefs = await SharedPreferences.getInstance();
    final today = _todayStr;
    final yesterday = _yesterdayStr;

    final lastDate = prefs.getString(_keyLastDate);
    int streak = prefs.getInt(_keyStreak) ?? 0;
    int todayReps = (lastDate == today) ? (prefs.getInt(_keyTodayReps) ?? 0) : 0;
    int totalAllTime = prefs.getInt(_keyTotalAllTime) ?? 0;
    int bestSession = prefs.getInt(_keyBestSession) ?? 0;

    if (lastDate != today) {
      if (lastDate == yesterday) {
        streak += 1;
      } else {
        streak = 1;
      }
    } else if (streak == 0) {
      streak = 1;
    }

    todayReps += reps;
    totalAllTime += reps;
    if (reps > bestSession) {
      bestSession = reps;
    }

    await prefs.setInt(_keyStreak, streak);
    await prefs.setString(_keyLastDate, today);
    await prefs.setInt(_keyTodayReps, todayReps);
    await prefs.setInt(_keyTotalAllTime, totalAllTime);
    await prefs.setInt(_keyBestSession, bestSession);

    // Sync added exercise minutes to backend health log
    final addedMinutes = (durationSeconds / 60).ceil().clamp(1, 120);
    try {
      final wellnessRepo = _ref.read(wellnessRepositoryProvider);
      final currentLog = await wellnessRepo.getHealthLog(today);
      final currentExercise = currentLog?.exerciseDurationMinutes ?? 0;

      await wellnessRepo.upsertHealthLog(
        date: today,
        sleepDurationMinutes: currentLog?.sleepDurationMinutes ?? 0,
        sleepQuality: currentLog?.sleepQuality ?? 85,
        exerciseDurationMinutes: currentExercise + addedMinutes,
        dailySteps: currentLog?.dailySteps ?? 0,
        waterIntakeMl: currentLog?.waterIntakeMl ?? 0,
        mood: currentLog?.mood ?? 'Motivated',
        energyLevel: currentLog?.energyLevel ?? 80,
        notes: currentLog?.notes,
      );

      _ref.invalidate(dailyAnalyticsProvider);
      _ref.invalidate(todayHealthLogProvider);
      _ref.invalidate(weeklyAnalyticsProvider);
    } catch (_) {
      // Local streak still saved even if offline
    }

    state = PushupStatsState(
      currentStreak: streak,
      todayReps: todayReps,
      totalAllTimeReps: totalAllTime,
      bestSessionReps: bestSession,
      lastWorkoutDate: today,
      isLoading: false,
    );
  }
}

final pushupStatsProvider = StateNotifierProvider<PushupStatsNotifier, PushupStatsState>((ref) {
  return PushupStatsNotifier(ref);
});

