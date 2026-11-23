import 'package:flutter_test/flutter_test.dart';
import 'package:lifesync_mobile/features/wellness/providers/step_counter_provider.dart';

void main() {
  const today = '2026-11-23';

  group('calculateStepDelta', () {
    test('initializes baseline to 0 on fresh run or day rollover', () {
      final result = calculateStepDelta(
        hardwareSteps: 12450,
        today: today,
        savedDate: null,
        currentTodaySteps: 0,
        lastHardwareSteps: null,
      );

      expect(result.todaySteps, 0);
      expect(result.lastHardwareSteps, 12450);
      expect(result.savedDate, today);
      expect(result.delta, 0);

      final rollover = calculateStepDelta(
        hardwareSteps: 18000,
        today: today,
        savedDate: '2026-11-22',
        currentTodaySteps: 5400,
        lastHardwareSteps: 17000,
      );

      expect(rollover.todaySteps, 0);
      expect(rollover.lastHardwareSteps, 18000);
      expect(rollover.savedDate, today);
      expect(rollover.delta, 0);
    });

    test('preserves existing todaySteps when lastHardwareSteps is null on same day', () {
      final result = calculateStepDelta(
        hardwareSteps: 9000,
        today: today,
        savedDate: today,
        currentTodaySteps: 2400,
        lastHardwareSteps: null,
      );

      expect(result.todaySteps, 2400);
      expect(result.lastHardwareSteps, 9000);
      expect(result.delta, 0);
    });

    test('accumulates normal step increments (+1, +15, +25)', () {
      final step1 = calculateStepDelta(
        hardwareSteps: 1001,
        today: today,
        savedDate: today,
        currentTodaySteps: 500,
        lastHardwareSteps: 1000,
      );
      expect(step1.delta, 1);
      expect(step1.todaySteps, 501);
      expect(step1.lastHardwareSteps, 1001);

      final step2 = calculateStepDelta(
        hardwareSteps: 1016,
        today: today,
        savedDate: today,
        currentTodaySteps: step1.todaySteps,
        lastHardwareSteps: step1.lastHardwareSteps,
      );
      expect(step2.delta, 15);
      expect(step2.todaySteps, 516);

      final step3 = calculateStepDelta(
        hardwareSteps: 1041,
        today: today,
        savedDate: today,
        currentTodaySteps: step2.todaySteps,
        lastHardwareSteps: step2.lastHardwareSteps,
      );
      expect(step3.delta, 25);
      expect(step3.todaySteps, 541);
    });

    test('handles large same-day catch-up above 10,000 steps', () {
      final result = calculateStepDelta(
        hardwareSteps: 25000,
        today: today,
        savedDate: today,
        currentTodaySteps: 1200,
        lastHardwareSteps: 10000,
      );

      expect(result.delta, 15000);
      expect(result.todaySteps, 16200);
      expect(result.lastHardwareSteps, 25000);
    });

    test('recovers same-day device reboot without losing pre-reboot or post-reboot steps', () {
      final result = calculateStepDelta(
        hardwareSteps: 420,
        today: today,
        savedDate: today,
        currentTodaySteps: 3200,
        lastHardwareSteps: 15400,
      );

      expect(result.delta, 420);
      expect(result.todaySteps, 3620);
      expect(result.lastHardwareSteps, 420);
    });

    test('ignores corrupted spikes (>100,000) and negative sensor values safely', () {
      final spike = calculateStepDelta(
        hardwareSteps: 500000,
        today: today,
        savedDate: today,
        currentTodaySteps: 3000,
        lastHardwareSteps: 10000,
      );

      expect(spike.delta, 0);
      expect(spike.todaySteps, 3000);
      expect(spike.lastHardwareSteps, 500000);

      final negative = calculateStepDelta(
        hardwareSteps: -5,
        today: today,
        savedDate: today,
        currentTodaySteps: 3000,
        lastHardwareSteps: 10000,
      );

      expect(negative.delta, 0);
      expect(negative.todaySteps, 3000);
      expect(negative.lastHardwareSteps, 10000);
    });
  });

  group('StepCounterState.copyWith', () {
    test('preserves errorMessage when updating pedestrianStatus', () {
      const initial = StepCounterState(
        hasPermission: true,
        isTracking: false,
        errorMessage: 'Sensor langkah tidak tersedia.',
      );

      final updated = initial.copyWith(pedestrianStatus: 'unknown');

      expect(updated.pedestrianStatus, 'unknown');
      expect(updated.errorMessage, 'Sensor langkah tidak tersedia.');
    });

    test('clears errorMessage only when clearError is true', () {
      const initial = StepCounterState(
        hasPermission: true,
        isTracking: false,
        errorMessage: 'Sensor langkah tidak tersedia.',
      );

      final cleared = initial.copyWith(isTracking: true, clearError: true);

      expect(cleared.isTracking, true);
      expect(cleared.errorMessage, isNull);
    });
  });
}
