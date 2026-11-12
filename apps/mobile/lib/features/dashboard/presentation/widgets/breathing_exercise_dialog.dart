import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../app/theme/app_colors.dart';

class BreathingExerciseDialog extends StatefulWidget {
  const BreathingExerciseDialog({super.key});

  @override
  State<BreathingExerciseDialog> createState() => _BreathingExerciseDialogState();
}

class _BreathingExerciseDialogState extends State<BreathingExerciseDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  Timer? _timer;
  int _secondsRemaining = 60;
  String _phase = 'Tarik Napas';
  bool _isPlaying = true;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    );
    _startBreathingCycle();
  }

  void _startBreathingCycle() {
    _animController.forward();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_secondsRemaining <= 1) {
        timer.cancel();
        setState(() {
          _secondsRemaining = 0;
          _isPlaying = false;
        });
        return;
      }

      setState(() {
        _secondsRemaining--;
        final cyclePos = (60 - _secondsRemaining) % 16;
        if (cyclePos < 4) {
          _phase = 'Tarik Napas (Inhale)';
          _animController.forward();
        } else if (cyclePos < 8) {
          _phase = 'Tahan Napas (Hold)';
        } else if (cyclePos < 12) {
          _phase = 'Hembuskan (Exhale)';
          _animController.reverse();
        } else {
          _phase = 'Istirahat (Rest)';
        }
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      backgroundColor: AppColors.surface,
      contentPadding: const EdgeInsets.all(28),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Latihan Pernapasan',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            '1 Menit Box Breathing untuk menenangkan sistem saraf dan memulihkan fokus.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(color: AppColors.onSurfaceVariant),
          ),
          const SizedBox(height: 30),

          // Animated Pulsing Breathing Circle
          AnimatedBuilder(
            animation: _animController,
            builder: (context, child) {
              final scale = 0.8 + (_animController.value * 0.4);
              return Transform.scale(
                scale: scale,
                child: Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        AppColors.secondaryContainer,
                        AppColors.primary.withValues(alpha: 0.2),
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        blurRadius: 24,
                        spreadRadius: 8,
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      '$_secondsRemaining s',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 30),
          Text(
            _phase,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            '4s Tarik • 4s Tahan • 4s Hembus • 4s Rileks',
            style: TextStyle(fontSize: 11, color: AppColors.outline),
          ),
        ],
      ),
    );
  }
}

