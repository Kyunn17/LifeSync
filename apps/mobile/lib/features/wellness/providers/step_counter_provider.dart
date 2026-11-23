import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:pedometer/pedometer.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../insights/providers/insights_provider.dart';
import 'wellness_provider.dart';

class StepCounterState {
  final int todaySteps;
  final String pedestrianStatus; // 'walking', 'stopped', 'unknown'
  final bool hasPermission;
  final bool isTracking;
  final String? errorMessage;

  const StepCounterState({
    this.todaySteps = 0,
    this.pedestrianStatus = 'unknown',
    this.hasPermission = false,
    this.isTracking = false,
    this.errorMessage,
  });

  StepCounterState copyWith({
    int? todaySteps,
    String? pedestrianStatus,
    bool? hasPermission,
    bool? isTracking,
    String? errorMessage,
  }) {
    return StepCounterState(
      todaySteps: todaySteps ?? this.todaySteps,
      pedestrianStatus: pedestrianStatus ?? this.pedestrianStatus,
      hasPermission: hasPermission ?? this.hasPermission,
      isTracking: isTracking ?? this.isTracking,
      errorMessage: errorMessage,
    );
  }
}

class StepCounterNotifier extends StateNotifier<StepCounterState> {
  final Ref _ref;
  StreamSubscription<StepCount>? _stepSubscription;
  StreamSubscription<PedestrianStatus>? _statusSubscription;
  int _lastSyncedSteps = -1;
  bool _isSyncing = false;

  static const _prefDateKey = 'lifesync_step_date';
  static const _prefLastHardwareStepsKey = 'lifesync_step_last_hardware';
  static const _prefTodayStepsKey = 'lifesync_step_today_cached';

  StepCounterNotifier(this._ref) : super(const StepCounterState()) {
    _init();
  }

  String get _todayStr => DateFormat('yyyy-MM-dd').format(DateTime.now());

  Future<void> _init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedDate = prefs.getString(_prefDateKey);
      int cachedSteps = 0;
      if (savedDate == _todayStr) {
        cachedSteps = prefs.getInt(_prefTodayStepsKey) ?? 0;
      }

      // Check if existing health log for today has higher step count
      try {
        final wellnessRepo = _ref.read(wellnessRepositoryProvider);
        final currentLog = await wellnessRepo.getHealthLog(_todayStr);
        if (currentLog != null && currentLog.dailySteps > cachedSteps) {
          cachedSteps = currentLog.dailySteps;
          await prefs.setString(_prefDateKey, _todayStr);
          await prefs.setInt(_prefTodayStepsKey, cachedSteps);
        }
      } catch (_) {}

      final status = await Permission.activityRecognition.status;
      if (status.isGranted) {
        state = state.copyWith(hasPermission: true, todaySteps: cachedSteps);
        _startListening();
      } else {
        state = state.copyWith(hasPermission: false, todaySteps: cachedSteps);
      }
    } catch (_) {
      // Keep default state if activity recognition check fails on startup.
    }
  }

  Future<bool> requestPermissionAndStart() async {
    try {
      final status = await Permission.activityRecognition.request();
      if (status.isGranted) {
        state = state.copyWith(hasPermission: true, errorMessage: null);
        _startListening();
        return true;
      } else if (status.isPermanentlyDenied) {
        state = state.copyWith(
          hasPermission: false,
          errorMessage: 'Izin Aktivitas Fisik ditolak permanen. Buka Pengaturan HP untuk mengaktifkan.',
        );
        await openAppSettings();
        return false;
      } else {
        state = state.copyWith(
          hasPermission: false,
          errorMessage: 'Izin sensor langkah diperlukan untuk menghitung langkah otomatis.',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(
        hasPermission: false,
        errorMessage: 'Gagal meminta izin sensor: $e',
      );
      return false;
    }
  }

  void _startListening() {
    _stepSubscription?.cancel();
    _statusSubscription?.cancel();

    state = state.copyWith(isTracking: true, errorMessage: null);

    try {
      _stepSubscription = Pedometer.stepCountStream.listen(
        _onStepCount,
        onError: (error) {
          state = state.copyWith(
            isTracking: false,
            errorMessage: 'Sensor langkah tidak tersedia atau dibatasi sistem.',
          );
        },
        cancelOnError: false,
      );
    } catch (e) {
      state = state.copyWith(
        isTracking: false,
        errorMessage: 'Gagal inisialisasi sensor langkah: $e',
      );
    }

    try {
      _statusSubscription = Pedometer.pedestrianStatusStream.listen(
        (PedestrianStatus event) {
          state = state.copyWith(pedestrianStatus: event.status);
        },
        onError: (_) {
          state = state.copyWith(pedestrianStatus: 'unknown');
        },
        cancelOnError: false,
      );
    } catch (_) {
      state = state.copyWith(pedestrianStatus: 'unknown');
    }
  }

  Future<void> _onStepCount(StepCount event) async {
    final prefs = await SharedPreferences.getInstance();
    final today = _todayStr;
    final savedDate = prefs.getString(_prefDateKey);
    int currentTodaySteps = prefs.getInt(_prefTodayStepsKey) ?? 0;
    int? lastHardware = prefs.getInt(_prefLastHardwareStepsKey);

    // Day rolled over
    if (savedDate != today) {
      currentTodaySteps = 0;
      lastHardware = event.steps;
      await prefs.setString(_prefDateKey, today);
      await prefs.setInt(_prefTodayStepsKey, 0);
      await prefs.setInt(_prefLastHardwareStepsKey, event.steps);
    }

    if (lastHardware == null) {
      lastHardware = event.steps;
      await prefs.setInt(_prefLastHardwareStepsKey, event.steps);
    }

    // Delta calculation: accumulate valid step increments
    int delta = 0;
    if (event.steps >= lastHardware) {
      delta = event.steps - lastHardware;
      // Sanity cap: ignore unrealistic single-event jumps (>10,000 steps)
      if (delta > 10000) delta = 0;
    } else {
      // Device rebooted; hardware counter reset below lastHardware
      delta = 0;
    }

    currentTodaySteps = (currentTodaySteps + delta).clamp(0, 200000);
    await prefs.setInt(_prefTodayStepsKey, currentTodaySteps);
    await prefs.setInt(_prefLastHardwareStepsKey, event.steps);

    state = state.copyWith(
      todaySteps: currentTodaySteps,
      isTracking: true,
      errorMessage: null,
    );

    // Auto-sync to backend every 25 new steps
    if (_lastSyncedSteps == -1 || (currentTodaySteps - _lastSyncedSteps) >= 25) {
      await syncStepsToBackend(stepsOverride: currentTodaySteps);
    }
  }

  Future<void> syncStepsToBackend({int? stepsOverride}) async {
    if (_isSyncing) return;
    final steps = stepsOverride ?? state.todaySteps;
    if (steps <= 0) return;

    _isSyncing = true;
    try {
      final today = _todayStr;
      final wellnessRepo = _ref.read(wellnessRepositoryProvider);
      final currentLog = await wellnessRepo.getHealthLog(today);

      // Keep whichever is higher so manual edits or sensor steps never overwrite downwards
      final existingSteps = currentLog?.dailySteps ?? 0;
      final finalSteps = steps > existingSteps ? steps : existingSteps;

      if (finalSteps > existingSteps) {
        await wellnessRepo.upsertHealthLog(
          date: today,
          sleepDurationMinutes: currentLog?.sleepDurationMinutes ?? 0,
          sleepQuality: currentLog?.sleepQuality ?? 85,
          exerciseDurationMinutes: currentLog?.exerciseDurationMinutes ?? 0,
          dailySteps: finalSteps,
          waterIntakeMl: currentLog?.waterIntakeMl ?? 0,
          mood: currentLog?.mood ?? 'Calm',
          energyLevel: currentLog?.energyLevel ?? 75,
          notes: currentLog?.notes,
        );
        _lastSyncedSteps = finalSteps;
        _ref.invalidate(dailyAnalyticsProvider);
        _ref.invalidate(todayHealthLogProvider);
        _ref.invalidate(weeklyAnalyticsProvider);
      } else {
        _lastSyncedSteps = existingSteps;
      }
    } catch (_) {
      // Fail silently on background sync; will retry on next batch
    } finally {
      _isSyncing = false;
    }
  }

  @override
  void dispose() {
    _stepSubscription?.cancel();
    _statusSubscription?.cancel();
    super.dispose();
  }
}

final stepCounterProvider = StateNotifierProvider<StepCounterNotifier, StepCounterState>((ref) {
  return StepCounterNotifier(ref);
});

