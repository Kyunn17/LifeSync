import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:pedometer/pedometer.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../auth/providers/auth_provider.dart';
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
    bool clearError = false,
  }) {
    return StepCounterState(
      todaySteps: todaySteps ?? this.todaySteps,
      pedestrianStatus: pedestrianStatus ?? this.pedestrianStatus,
      hasPermission: hasPermission ?? this.hasPermission,
      isTracking: isTracking ?? this.isTracking,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class StepDeltaResult {
  final int todaySteps;
  final int lastHardwareSteps;
  final String savedDate;
  final int delta;

  const StepDeltaResult({
    required this.todaySteps,
    required this.lastHardwareSteps,
    required this.savedDate,
    required this.delta,
  });
}

/// Computes updated daily step totals from a cumulative hardware sensor reading.
StepDeltaResult calculateStepDelta({
  required int hardwareSteps,
  required String today,
  required String? savedDate,
  required int currentTodaySteps,
  required int? lastHardwareSteps,
  int maxSingleEventDelta = 100000,
  int maxDailySteps = 200000,
}) {
  if (hardwareSteps < 0) {
    return StepDeltaResult(
      todaySteps: currentTodaySteps.clamp(0, maxDailySteps),
      lastHardwareSteps: lastHardwareSteps ?? 0,
      savedDate: savedDate ?? today,
      delta: 0,
    );
  }

  if (savedDate != today) {
    return StepDeltaResult(
      todaySteps: 0,
      lastHardwareSteps: hardwareSteps,
      savedDate: today,
      delta: 0,
    );
  }

  if (lastHardwareSteps == null) {
    return StepDeltaResult(
      todaySteps: currentTodaySteps.clamp(0, maxDailySteps),
      lastHardwareSteps: hardwareSteps,
      savedDate: today,
      delta: 0,
    );
  }

  int delta = 0;
  if (hardwareSteps >= lastHardwareSteps) {
    final rawDelta = hardwareSteps - lastHardwareSteps;
    delta = rawDelta <= maxSingleEventDelta ? rawDelta : 0;
  } else {
    // Same-day device reboot reset the hardware counter before these new steps.
    delta = hardwareSteps <= maxSingleEventDelta ? hardwareSteps : 0;
  }

  final nextSteps = (currentTodaySteps + delta).clamp(0, maxDailySteps);
  return StepDeltaResult(
    todaySteps: nextSteps,
    lastHardwareSteps: hardwareSteps,
    savedDate: today,
    delta: delta,
  );
}

class StepCounterNotifier extends StateNotifier<StepCounterState>
    with WidgetsBindingObserver {
  final Ref _ref;
  StreamSubscription<StepCount>? _stepSubscription;
  StreamSubscription<PedestrianStatus>? _statusSubscription;
  SharedPreferences? _prefs;
  Future<void>? _initFuture;

  String? _savedDate;
  int _todaySteps = 0;
  int? _lastHardwareSteps;
  int _lastSyncedSteps = -1;
  bool _isSyncing = false;
  bool _observerAttached = false;

  static const _prefDateKey = 'lifesync_step_date';
  static const _prefLastHardwareStepsKey = 'lifesync_step_last_hardware';
  static const _prefTodayStepsKey = 'lifesync_step_today_cached';

  StepCounterNotifier(this._ref) : super(const StepCounterState()) {
    try {
      WidgetsBinding.instance.addObserver(this);
      _observerAttached = true;
    } catch (_) {
      // WidgetsBinding may be absent in isolated non-widget unit tests.
    }
    _hydrateSync();
    _initFuture = _init();
  }

  String get _todayStr => DateFormat('yyyy-MM-dd').format(DateTime.now());

  void _hydrateSync() {
    try {
      final prefs = _ref.read(sharedPreferencesProvider);
      _prefs = prefs;
      _hydrateFromPrefs(prefs);
      if (_todaySteps > 0) {
        state = state.copyWith(todaySteps: _todaySteps);
      }
    } catch (_) {
      // Fallback to async SharedPreferences.getInstance() in _init().
    }
  }

  void _hydrateFromPrefs(SharedPreferences prefs) {
    final today = _todayStr;
    final savedDate = prefs.getString(_prefDateKey);
    if (savedDate == today) {
      _savedDate = savedDate;
      _todaySteps = (prefs.getInt(_prefTodayStepsKey) ?? 0).clamp(0, 200000);
      _lastHardwareSteps = prefs.getInt(_prefLastHardwareStepsKey);
    } else {
      _savedDate = today;
      _todaySteps = 0;
      _lastHardwareSteps = null;
    }
  }

  Future<SharedPreferences> _getPrefs() async {
    if (_prefs != null) return _prefs!;
    try {
      _prefs = _ref.read(sharedPreferencesProvider);
      return _prefs!;
    } catch (_) {
      _prefs = await SharedPreferences.getInstance();
      return _prefs!;
    }
  }

  Future<void> _init() async {
    try {
      if (_prefs == null) {
        final prefs = await _getPrefs();
        if (!mounted) return;
        _hydrateFromPrefs(prefs);
        if (_todaySteps > 0 && state.todaySteps != _todaySteps) {
          state = state.copyWith(todaySteps: _todaySteps);
        }
      }

      final status = await Permission.activityRecognition.status;
      if (!mounted) return;

      if (status.isGranted) {
        state = state.copyWith(
          hasPermission: true,
          todaySteps: _todaySteps,
          clearError: true,
        );
        _startListening();
      } else {
        state = state.copyWith(
          hasPermission: false,
          todaySteps: _todaySteps,
        );
      }

      unawaited(_reconcileWithBackend());
    } catch (_) {
      // Keep current state if activity recognition check fails on startup.
    }
  }

  Future<void> _reconcileWithBackend() async {
    try {
      final wellnessRepo = _ref.read(wellnessRepositoryProvider);
      final currentLog = await wellnessRepo.getHealthLog(_todayStr);
      if (!mounted) return;
      if (currentLog != null && currentLog.dailySteps > _todaySteps) {
        await _applyExternalTodaySteps(currentLog.dailySteps, markSynced: true);
      }
    } catch (_) {
      // Non-blocking reconciliation; retry on next resume or sync.
    }
  }

  Future<void> _persistStepState(
    String savedDate,
    int todaySteps,
    int? lastHardwareSteps,
  ) async {
    try {
      final prefs = await _getPrefs();
      await prefs.setString(_prefDateKey, savedDate);
      await prefs.setInt(_prefTodayStepsKey, todaySteps);
      if (lastHardwareSteps != null) {
        await prefs.setInt(_prefLastHardwareStepsKey, lastHardwareSteps);
      } else {
        await prefs.remove(_prefLastHardwareStepsKey);
      }
    } catch (_) {
      // Keep in-memory state if disk write fails transiently.
    }
  }

  Future<void> _applyExternalTodaySteps(
    int steps, {
    bool markSynced = false,
  }) async {
    final clamped = steps.clamp(0, 200000);
    final today = _todayStr;
    _savedDate = today;
    _todaySteps = clamped;
    if (markSynced) {
      _lastSyncedSteps = clamped;
    }

    await _persistStepState(today, _todaySteps, _lastHardwareSteps);
    if (mounted) {
      state = state.copyWith(todaySteps: _todaySteps);
    }
  }

  /// Adopts a higher step count saved manually (e.g. from WellnessScreen) for today.
  Future<void> adoptExternalSteps(int steps, {required String date}) async {
    if (date != _todayStr || steps <= 0) return;
    if (_initFuture != null) {
      await _initFuture;
    }
    if (!mounted) return;

    if (_savedDate != _todayStr) {
      _savedDate = _todayStr;
      _todaySteps = 0;
      _lastHardwareSteps = null;
    }

    if (steps > _todaySteps) {
      await _applyExternalTodaySteps(steps, markSynced: true);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!mounted) return;
    if (state == AppLifecycleState.resumed) {
      unawaited(_handleAppResumed());
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive) {
      if (_todaySteps > 0 && _todaySteps > _lastSyncedSteps) {
        unawaited(syncStepsToBackend(stepsOverride: _todaySteps));
      }
    }
  }

  Future<void> _handleAppResumed() async {
    try {
      final today = _todayStr;
      if (_savedDate != null && _savedDate != today) {
        _savedDate = today;
        _todaySteps = 0;
        _lastHardwareSteps = null;
        _lastSyncedSteps = -1;
        await _persistStepState(today, 0, null);
        if (!mounted) return;
        state = state.copyWith(todaySteps: 0);
      }

      final status = await Permission.activityRecognition.status;
      if (!mounted) return;

      if (status.isGranted) {
        if (!state.hasPermission || !state.isTracking) {
          state = state.copyWith(hasPermission: true, clearError: true);
          _startListening();
        }
      } else {
        _stopListening();
        if (state.hasPermission || state.isTracking) {
          state = state.copyWith(
            hasPermission: false,
            isTracking: false,
            pedestrianStatus: 'unknown',
          );
        }
      }

      unawaited(_reconcileWithBackend());
    } catch (_) {
      // Ignore transient permission check failures during app resume.
    }
  }

  Future<bool> requestPermissionAndStart() async {
    try {
      if (_initFuture != null) {
        await _initFuture;
      }
      if (!mounted) return false;

      final status = await Permission.activityRecognition.request();
      if (!mounted) return false;

      if (status.isGranted) {
        state = state.copyWith(hasPermission: true, clearError: true);
        _startListening();
        return true;
      } else if (status.isPermanentlyDenied) {
        state = state.copyWith(
          hasPermission: false,
          errorMessage:
              'Izin Aktivitas Fisik ditolak permanen. Buka Pengaturan HP untuk mengaktifkan.',
        );
        await openAppSettings();
        return false;
      } else {
        state = state.copyWith(
          hasPermission: false,
          errorMessage:
              'Izin sensor langkah diperlukan untuk menghitung langkah otomatis.',
        );
        return false;
      }
    } catch (e) {
      if (mounted) {
        state = state.copyWith(
          hasPermission: false,
          errorMessage: 'Gagal meminta izin sensor: $e',
        );
      }
      return false;
    }
  }

  void _stopListening() {
    _stepSubscription?.cancel();
    _statusSubscription?.cancel();
    _stepSubscription = null;
    _statusSubscription = null;
  }

  void _startListening() {
    _stopListening();

    state = state.copyWith(isTracking: true, clearError: true);

    try {
      _stepSubscription = Pedometer.stepCountStream.listen(
        _onStepCount,
        onError: (error) {
          if (!mounted) return;
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
          if (!mounted) return;
          state = state.copyWith(pedestrianStatus: event.status);
        },
        onError: (_) {
          if (!mounted) return;
          state = state.copyWith(pedestrianStatus: 'unknown');
        },
        cancelOnError: false,
      );
    } catch (_) {
      state = state.copyWith(pedestrianStatus: 'unknown');
    }
  }

  void _onStepCount(StepCount event) {
    final result = calculateStepDelta(
      hardwareSteps: event.steps,
      today: _todayStr,
      savedDate: _savedDate,
      currentTodaySteps: _todaySteps,
      lastHardwareSteps: _lastHardwareSteps,
    );

    _savedDate = result.savedDate;
    _todaySteps = result.todaySteps;
    _lastHardwareSteps = result.lastHardwareSteps;

    if (mounted) {
      state = state.copyWith(
        todaySteps: _todaySteps,
        isTracking: true,
        clearError: true,
      );
    }

    unawaited(
      _persistStepState(result.savedDate, _todaySteps, _lastHardwareSteps),
    );

    // Auto-sync to backend every 25 new steps
    if (_todaySteps > 0 &&
        (_lastSyncedSteps == -1 || (_todaySteps - _lastSyncedSteps) >= 25)) {
      unawaited(syncStepsToBackend(stepsOverride: _todaySteps));
    }
  }

  Future<void> syncStepsToBackend({int? stepsOverride}) async {
    if (_isSyncing) return;
    final localSteps = (stepsOverride ?? _todaySteps).clamp(0, 200000);

    _isSyncing = true;
    try {
      final today = _todayStr;
      final wellnessRepo = _ref.read(wellnessRepositoryProvider);
      final currentLog = await wellnessRepo.getHealthLog(today);
      if (!mounted) return;

      // Keep whichever is higher so manual edits or sensor steps never overwrite downwards
      final existingSteps = currentLog?.dailySteps ?? 0;
      if (existingSteps > localSteps) {
        await _applyExternalTodaySteps(existingSteps, markSynced: true);
        return;
      }

      if (localSteps > existingSteps && localSteps > 0) {
        await wellnessRepo.upsertHealthLog(
          date: today,
          sleepDurationMinutes: currentLog?.sleepDurationMinutes ?? 0,
          sleepQuality: currentLog?.sleepQuality ?? 85,
          exerciseDurationMinutes: currentLog?.exerciseDurationMinutes ?? 0,
          dailySteps: localSteps,
          waterIntakeMl: currentLog?.waterIntakeMl ?? 0,
          mood: currentLog?.mood ?? 'Calm',
          energyLevel: currentLog?.energyLevel ?? 75,
          notes: currentLog?.notes,
        );
        if (!mounted) return;
        _lastSyncedSteps = localSteps;
        _ref.invalidate(dailyAnalyticsProvider);
        _ref.invalidate(todayHealthLogProvider);
        _ref.invalidate(weeklyAnalyticsProvider);
      } else {
        _lastSyncedSteps = existingSteps;
      }
    } catch (_) {
      // Fail silently on background sync; will retry on next batch or pause
    } finally {
      _isSyncing = false;
    }
  }

  @override
  void dispose() {
    if (_observerAttached) {
      try {
        WidgetsBinding.instance.removeObserver(this);
      } catch (_) {}
      _observerAttached = false;
    }
    _stopListening();
    super.dispose();
  }
}

final stepCounterProvider = StateNotifierProvider<StepCounterNotifier, StepCounterState>((ref) {
  return StepCounterNotifier(ref);
});

