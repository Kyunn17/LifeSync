import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:pedometer/pedometer.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../dashboard/providers/dashboard_provider.dart';
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
  static const _prefBaselineKey = 'lifesync_step_baseline';
  static const _prefTodayStepsKey = 'lifesync_step_today_cached';

  StepCounterNotifier(this._ref) : super(const StepCounterState()) {
    _init();
  }

  String get _todayStr => DateFormat('yyyy-MM-dd').format(DateTime.now());

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    final savedDate = prefs.getString(_prefDateKey);
    int cachedSteps = 0;
    if (savedDate == _todayStr) {
      cachedSteps = prefs.getInt(_prefTodayStepsKey) ?? 0;
    }

    final status = await Permission.activityRecognition.status;
    if (status.isGranted) {
      state = state.copyWith(hasPermission: true, todaySteps: cachedSteps);
      _startListening();
    } else {
      state = state.copyWith(hasPermission: false, todaySteps: cachedSteps);
    }
  }

  Future<bool> requestPermissionAndStart() async {
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
  }

  void _startListening() {
    _stepSubscription?.cancel();
    _statusSubscription?.cancel();

    state = state.copyWith(isTracking: true, errorMessage: null);

    _stepSubscription = Pedometer.stepCountStream.listen(
      _onStepCount,
      onError: (error) {
        state = state.copyWith(
          isTracking: false,
          errorMessage: 'Sensor langkah tidak tersedia di perangkat ini.',
        );
      },
    );

    _statusSubscription = Pedometer.pedestrianStatusStream.listen(
      (PedestrianStatus event) {
        state = state.copyWith(pedestrianStatus: event.status);
      },
      onError: (_) {
        state = state.copyWith(pedestrianStatus: 'unknown');
      },
    );
  }

  Future<void> _onStepCount(StepCount event) async {
    final prefs = await SharedPreferences.getInstance();
    final today = _todayStr;
    final savedDate = prefs.getString(_prefDateKey);
    int? baseline = prefs.getInt(_prefBaselineKey);

    // Day rolled over or first run
    if (savedDate != today || baseline == null) {
      baseline = event.steps;
      await prefs.setString(_prefDateKey, today);
      await prefs.setInt(_prefBaselineKey, baseline);
    }

    // Device rebooted (hardware counter reset below baseline)
    if (event.steps < baseline) {
      baseline = event.steps;
      await prefs.setInt(_prefBaselineKey, baseline);
    }

    final calculatedSteps = (event.steps - baseline).clamp(0, 200000);
    await prefs.setInt(_prefTodayStepsKey, calculatedSteps);

    state = state.copyWith(todaySteps: calculatedSteps, isTracking: true);

    // Auto-sync to backend every 25 new steps
    if (_lastSyncedSteps == -1 || (calculatedSteps - _lastSyncedSteps) >= 25) {
      await syncStepsToBackend(stepsOverride: calculatedSteps);
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
          sleepDurationMinutes: currentLog?.sleepDurationMinutes ?? 420,
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

