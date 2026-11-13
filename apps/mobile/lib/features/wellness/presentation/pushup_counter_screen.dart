import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mlkit_pose_detection/google_mlkit_pose_detection.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../app/theme/app_colors.dart';
import '../providers/pushup_provider.dart';
import 'widgets/pose_painter.dart';

enum PushupDetectionMode { sideAngle, floorProximity }

enum PushupDifficulty {
  easy('Mudah / Santai', 120.0, 138.0, 0.40, 0.28),
  standard('Standar', 110.0, 142.0, 0.46, 0.32),
  strict('Ketat (Strict)', 95.0, 155.0, 0.54, 0.35);

  final String label;
  final double downAngle;
  final double upAngle;
  final double floorDownRatio;
  final double floorUpRatio;

  const PushupDifficulty(
    this.label,
    this.downAngle,
    this.upAngle,
    this.floorDownRatio,
    this.floorUpRatio,
  );
}

class PushupCounterScreen extends ConsumerStatefulWidget {
  const PushupCounterScreen({super.key});

  @override
  ConsumerState<PushupCounterScreen> createState() => _PushupCounterScreenState();
}

class _PushupCounterScreenState extends ConsumerState<PushupCounterScreen>
    with WidgetsBindingObserver {
  CameraController? _cameraController;
  List<CameraDescription> _cameras = [];
  int _selectedCameraIndex = 0;

  final PoseDetector _poseDetector = PoseDetector(
    options: PoseDetectorOptions(mode: PoseDetectionMode.stream),
  );

  bool _isProcessingFrame = false;
  bool _hasPermission = false;
  bool _isInitializing = true;
  String? _errorMessage;

  List<Pose> _detectedPoses = [];
  Size _imageSize = Size.zero;
  InputImageRotation _imageRotation = InputImageRotation.rotation0deg;

  // Configuration
  PushupDetectionMode _mode = PushupDetectionMode.sideAngle;
  PushupDifficulty _difficulty = PushupDifficulty.standard;

  // Push-up state machine & anti-noise debounce
  int _repCount = 0;
  bool _isDown = false;
  double _currentMetric = 160.0; // Smoothed angle or proximity ratio
  double _depthProgress = 0.0; // 0.0 (top) to 1.0 (bottom)
  String _guidanceText = 'Posisikan tubuh dalam bingkai kamera';
  String _activeArmLabel = 'Mencari pose tubuh...';

  // State timers to reject camera shake / fast noise
  DateTime? _downStartTime;
  DateTime _lastRepTime = DateTime.now();
  int _consecutiveDownFrames = 0;
  int _consecutiveUpFrames = 0;

  // Smoothing filter
  final List<double> _metricHistory = [];
  static const int _historySize = 4;

  int _elapsedSeconds = 0;
  Timer? _sessionTimer;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initCameraAndPermissions();
    _sessionTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && !_isSaving) {
        setState(() => _elapsedSeconds++);
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _sessionTimer?.cancel();
    _cameraController?.dispose();
    _poseDetector.close();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _cameraController;
    if (controller == null || !controller.value.isInitialized) return;

    if (state == AppLifecycleState.inactive) {
      controller.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _startCamera(_cameras[_selectedCameraIndex]);
    }
  }

  Future<void> _initCameraAndPermissions() async {
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      if (mounted) {
        setState(() {
          _hasPermission = false;
          _isInitializing = false;
          _errorMessage =
              'Izin kamera diperlukan untuk mendeteksi gerakan push-up secara otomatis.';
        });
      }
      return;
    }

    _hasPermission = true;
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        if (mounted) {
          setState(() {
            _isInitializing = false;
            _errorMessage = 'Tidak ada kamera yang terdeteksi di perangkat ini.';
          });
        }
        return;
      }

      // Default to front camera
      final frontIndex = _cameras.indexWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
      );
      _selectedCameraIndex = frontIndex != -1 ? frontIndex : 0;

      await _startCamera(_cameras[_selectedCameraIndex]);
    } catch (e) {
      if (mounted) {
        setState(() {
          _isInitializing = false;
          _errorMessage = 'Gagal membuka kamera: $e';
        });
      }
    }
  }

  Future<void> _startCamera(CameraDescription camera) async {
    final previousController = _cameraController;
    if (previousController != null) {
      await previousController.stopImageStream().catchError((_) {});
      await previousController.dispose();
    }

    final controller = CameraController(
      camera,
      ResolutionPreset.medium,
      enableAudio: false,
      imageFormatGroup:
          Platform.isAndroid ? ImageFormatGroup.nv21 : ImageFormatGroup.bgra8888,
    );

    _cameraController = controller;

    try {
      await controller.initialize();
      if (!mounted) return;

      setState(() {
        _isInitializing = false;
        _errorMessage = null;
      });

      await controller.startImageStream(_processCameraImage);
    } catch (e) {
      if (mounted) {
        setState(() {
          _isInitializing = false;
          _errorMessage = 'Kamera gagal diinisialisasi: $e';
        });
      }
    }
  }

  Future<void> _switchCamera() async {
    if (_cameras.length < 2) return;
    setState(() => _isInitializing = true);
    _selectedCameraIndex = (_selectedCameraIndex + 1) % _cameras.length;
    await _startCamera(_cameras[_selectedCameraIndex]);
  }

  InputImage? _inputImageFromCameraImage(CameraImage image) {
    final controller = _cameraController;
    if (controller == null) return null;

    final camera = _cameras[_selectedCameraIndex];

    // Lock image rotation to camera sensor orientation to avoid orientation flipping on floor tilt
    final rotation =
        InputImageRotationValue.fromRawValue(camera.sensorOrientation) ??
            InputImageRotation.rotation0deg;

    final format = InputImageFormatValue.fromRawValue(image.format.raw);
    if (format == null ||
        (Platform.isAndroid && format != InputImageFormat.nv21) ||
        (Platform.isIOS && format != InputImageFormat.bgra8888)) {
      return null;
    }

    if (image.planes.length != 1) return null;
    final plane = image.planes.first;

    return InputImage.fromBytes(
      bytes: plane.bytes,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation,
        format: format,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
  }

  Future<void> _processCameraImage(CameraImage image) async {
    if (_isProcessingFrame || _isSaving) return;
    _isProcessingFrame = true;

    try {
      final inputImage = _inputImageFromCameraImage(image);
      if (inputImage == null) {
        _isProcessingFrame = false;
        return;
      }

      final poses = await _poseDetector.processImage(inputImage);
      if (!mounted) return;

      _evaluatePushupPose(
        poses,
        inputImage.metadata?.size ??
            Size(image.width.toDouble(), image.height.toDouble()),
        inputImage.metadata?.rotation ?? InputImageRotation.rotation0deg,
      );
    } catch (_) {
      // Ignore transient frame errors
    } finally {
      _isProcessingFrame = false;
    }
  }

  double _smoothMetric(double rawValue) {
    _metricHistory.add(rawValue);
    if (_metricHistory.length > _historySize) {
      _metricHistory.removeAt(0);
    }
    final sum = _metricHistory.reduce((a, b) => a + b);
    return sum / _metricHistory.length;
  }

  void _evaluatePushupPose(
    List<Pose> poses,
    Size imgSize,
    InputImageRotation rotation,
  ) {
    if (poses.isEmpty) {
      setState(() {
        _detectedPoses = [];
        _guidanceText = 'Tubuh belum terdeteksi. Posisikan diri dalam kamera.';
        _activeArmLabel = 'Tidak ada pose';
        _depthProgress = 0.0;
      });
      return;
    }

    final pose = poses.first;
    final now = DateTime.now();

    if (_mode == PushupDetectionMode.sideAngle) {
      // 1. Check landmarks for both left and right arms
      final lShoulder = pose.landmarks[PoseLandmarkType.leftShoulder];
      final lElbow = pose.landmarks[PoseLandmarkType.leftElbow];
      final lWrist = pose.landmarks[PoseLandmarkType.leftWrist];

      final rShoulder = pose.landmarks[PoseLandmarkType.rightShoulder];
      final rElbow = pose.landmarks[PoseLandmarkType.rightElbow];
      final rWrist = pose.landmarks[PoseLandmarkType.rightWrist];

      double? leftAngle;
      double leftConf = 0;
      if (lShoulder != null && lElbow != null && lWrist != null) {
        leftConf = (lShoulder.likelihood + lElbow.likelihood + lWrist.likelihood) / 3;
        if (leftConf >= 0.50) {
          leftAngle = _calculateAngle(lShoulder, lElbow, lWrist);
        }
      }

      double? rightAngle;
      double rightConf = 0;
      if (rShoulder != null && rElbow != null && rWrist != null) {
        rightConf = (rShoulder.likelihood + rElbow.likelihood + rWrist.likelihood) / 3;
        if (rightConf >= 0.50) {
          rightAngle = _calculateAngle(rShoulder, rElbow, rWrist);
        }
      }

      // Pick the arm with higher visibility/confidence
      double? rawAngle;
      String armLabel;
      if (leftConf >= 0.50 && leftConf >= rightConf) {
        rawAngle = leftAngle;
        armLabel = 'Lengan Kiri (${(leftConf * 100).toInt()}%)';
      } else if (rightConf >= 0.50) {
        rawAngle = rightAngle;
        armLabel = 'Lengan Kanan (${(rightConf * 100).toInt()}%)';
      } else {
        rawAngle = leftAngle ?? rightAngle;
        armLabel = 'Mendeteksi siluet...';
      }

      if (rawAngle == null) {
        setState(() {
          _detectedPoses = poses;
          _imageSize = imgSize;
          _imageRotation = rotation;
          _guidanceText = 'Pastikan bahu, siku & tangan tampak di kamera';
          _activeArmLabel = 'Lengan terhalang';
          _depthProgress = 0.0;
        });
        return;
      }

      final smoothedAngle = _smoothMetric(rawAngle);
      final downThreshold = _difficulty.downAngle;
      final upThreshold = _difficulty.upAngle;

      // Calculate depth progress: 0.0 (fully up) to 1.0 (down)
      final progress = ((upThreshold - smoothedAngle) / (upThreshold - downThreshold))
          .clamp(0.0, 1.0);

      String guidance = _guidanceText;
      bool downState = _isDown;
      int reps = _repCount;

      // State Machine with Anti-Shake Debouncing
      if (smoothedAngle <= downThreshold) {
        _consecutiveDownFrames++;
        _consecutiveUpFrames = 0;

        // Require at least 2 consecutive frames in DOWN position to reject single-frame noise
        if (_consecutiveDownFrames >= 2 && !downState) {
          downState = true;
          _downStartTime = now;
          HapticFeedback.selectionClick();
        }
        guidance = 'Posisi bawah tercapai! Dorong naik ⬆️';
      } else if (smoothedAngle >= upThreshold) {
        _consecutiveUpFrames++;
        _consecutiveDownFrames = 0;

        // Transition from DOWN -> UP = 1 Real Pushup
        if (downState && _consecutiveUpFrames >= 2) {
          final timeSinceLastRep = now.difference(_lastRepTime).inMilliseconds;
          final timeInDown = _downStartTime != null
              ? now.difference(_downStartTime!).inMilliseconds
              : 500;

          // Anti-cheat & anti-camera-shake:
          // A real human push-up takes at least 650ms total, and at least 100ms at bottom!
          if (timeSinceLastRep >= 650 && timeInDown >= 100) {
            reps += 1;
            downState = false;
            _lastRepTime = now;
            _downStartTime = null;
            HapticFeedback.heavyImpact();
            guidance = 'Mantap! +1 Repetisi 🔥';
          } else {
            // Rapid camera shake rejected
            downState = false;
          }
        } else if (!downState) {
          guidance = 'Siap! Turunkan badan hingga siku menekuk ⬇️';
        }
      } else {
        // Between up and down thresholds
        if (downState) {
          guidance = 'Dorong lengan sampai lurus ke atas...';
        } else if (progress > 0.4) {
          guidance = 'Bagus, turun lebih rendah lagi ⬇️';
        } else {
          guidance = 'Mulai turunkan badan perlahan...';
        }
      }

      setState(() {
        _detectedPoses = poses;
        _imageSize = imgSize;
        _imageRotation = rotation;
        _currentMetric = smoothedAngle;
        _depthProgress = progress;
        _isDown = downState;
        _repCount = reps;
        _guidanceText = guidance;
        _activeArmLabel = armLabel;
      });
    } else {
      // 2. Floor Proximity Mode (HP diletakkan di lantai di bawah dada)
      final lShoulder = pose.landmarks[PoseLandmarkType.leftShoulder];
      final rShoulder = pose.landmarks[PoseLandmarkType.rightShoulder];
      final nose = pose.landmarks[PoseLandmarkType.nose];

      if (lShoulder == null || rShoulder == null || lShoulder.likelihood < 0.45 || rShoulder.likelihood < 0.45) {
        setState(() {
          _detectedPoses = poses;
          _imageSize = imgSize;
          _imageRotation = rotation;
          _guidanceText = 'Letakkan HP terlentang di lantai tepat di bawah dada/wajah';
          _activeArmLabel = 'Bahu belum terlihat';
          _depthProgress = 0.0;
        });
        return;
      }

      final isRotated = rotation == InputImageRotation.rotation90deg ||
          rotation == InputImageRotation.rotation270deg;
      final effectiveWidth = isRotated ? imgSize.height : imgSize.width;
      final shoulderSpan = (lShoulder.x - rShoulder.x).abs();
      final rawRatio = effectiveWidth > 0 ? (shoulderSpan / effectiveWidth) : 0.0;
      final smoothedRatio = _smoothMetric(rawRatio);

      final downRatio = _difficulty.floorDownRatio;
      final upRatio = _difficulty.floorUpRatio;

      final progress = ((smoothedRatio - upRatio) / (downRatio - upRatio)).clamp(0.0, 1.0);

      String guidance = _guidanceText;
      bool downState = _isDown;
      int reps = _repCount;

      if (smoothedRatio >= downRatio) {
        _consecutiveDownFrames++;
        _consecutiveUpFrames = 0;

        if (_consecutiveDownFrames >= 2 && !downState) {
          downState = true;
          _downStartTime = now;
          HapticFeedback.selectionClick();
        }
        guidance = 'Dekat lantai tercapai! Dorong naik ⬆️';
      } else if (smoothedRatio <= upRatio) {
        _consecutiveUpFrames++;
        _consecutiveDownFrames = 0;

        if (downState && _consecutiveUpFrames >= 2) {
          final timeSinceLastRep = now.difference(_lastRepTime).inMilliseconds;
          if (timeSinceLastRep >= 650) {
            reps += 1;
            downState = false;
            _lastRepTime = now;
            _downStartTime = null;
            HapticFeedback.heavyImpact();
            guidance = 'Mantap! +1 Repetisi 🔥';
          } else {
            downState = false;
          }
        } else if (!downState) {
          guidance = 'Siap! Turunkan dada mendekati kamera HP ⬇️';
        }
      } else {
        guidance = downState ? 'Dorong naik kembali ke posisi plank...' : 'Dekatkan dada ke arah kamera...';
      }

      setState(() {
        _detectedPoses = poses;
        _imageSize = imgSize;
        _imageRotation = rotation;
        _currentMetric = smoothedRatio * 100;
        _depthProgress = progress;
        _isDown = downState;
        _repCount = reps;
        _guidanceText = guidance;
        _activeArmLabel = 'Mode Lantai • Wajah ${nose != null ? 'Terdeteksi' : 'Bahu'}';
      });
    }
  }

  double _calculateAngle(PoseLandmark a, PoseLandmark b, PoseLandmark c) {
    final radians =
        math.atan2(c.y - b.y, c.x - b.x) - math.atan2(a.y - b.y, a.x - b.x);
    double angle = (radians * 180.0 / math.pi).abs();
    if (angle > 180.0) {
      angle = 360.0 - angle;
    }
    return angle;
  }

  String _formatDuration(int totalSeconds) {
    final m = (totalSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (totalSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Future<void> _finishAndSave() async {
    if (_repCount == 0) {
      Navigator.pop(context);
      return;
    }

    setState(() => _isSaving = true);
    await ref.read(pushupStatsProvider.notifier).recordSession(
          reps: _repCount,
          durationSeconds: _elapsedSeconds,
        );

    if (mounted) {
      final newStreak = ref.read(pushupStatsProvider).currentStreak;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'Keren! $_repCount push-up disimpan • Streak: $newStreak Hari 🔥'),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
      Navigator.pop(context, _repCount);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stats = ref.watch(pushupStatsProvider);
    final kcalBurned = (_repCount * 0.45).toStringAsFixed(1);

    return Scaffold(
      backgroundColor: AppColors.inverseSurface,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Camera Preview + Skeleton Overlay
          if (_isInitializing)
            const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: AppColors.secondaryFixed),
                  SizedBox(height: 12),
                  Text(
                    'Menyiapkan AI Kamera ML Kit...',
                    style: TextStyle(color: Colors.white),
                  ),
                ],
              ),
            )
          else if (!_hasPermission || _errorMessage != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.videocam_off_rounded,
                      size: 56,
                      color: Colors.white54,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _errorMessage ?? 'Izin kamera dibutuhkan.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white, fontSize: 15),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      onPressed: () async {
                        await openAppSettings();
                        _initCameraAndPermissions();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryContainer,
                      ),
                      child: const Text(
                        'Buka Pengaturan Izin',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else if (_cameraController != null &&
              _cameraController!.value.isInitialized)
            Center(
              child: AspectRatio(
                aspectRatio: 1 / _cameraController!.value.aspectRatio,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CameraPreview(_cameraController!),
                    if (_imageSize != Size.zero)
                      CustomPaint(
                        painter: PosePainter(
                          poses: _detectedPoses,
                          imageSize: _imageSize,
                          rotation: _imageRotation,
                          cameraLensDirection:
                              _cameras[_selectedCameraIndex].lensDirection,
                          isDownPosition: _isDown,
                        ),
                      ),
                  ],
                ),
              ),
            ),

          // 2. Top & Bottom Cinematic Vignette Overlays
          IgnorePointer(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.65),
                    Colors.transparent,
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.78),
                  ],
                  stops: const [0.0, 0.25, 0.65, 1.0],
                ),
              ),
            ),
          ),

          // 3. Full Stitch HUD Overlay
          SafeArea(
            child: Column(
              children: [
                // Top Telemetry Bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildHudCircleBtn(
                        icon: Icons.close_rounded,
                        onTap: () => Navigator.pop(context),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.55),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: AppColors.secondaryFixed
                                .withValues(alpha: 0.35),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: AppColors.secondaryFixed,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 7),
                            const Text(
                              'ML KIT POSE • LIVE',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.0,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (_cameras.length > 1)
                        _buildHudCircleBtn(
                          icon: Icons.cameraswitch_rounded,
                          onTap: _switchCamera,
                        )
                      else
                        const SizedBox(width: 42),
                    ],
                  ),
                ),

                // Mode Selector Pill (Side Angle vs Floor Proximity)
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.52),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildModeTab(
                        label: '📐 Sandaran (Sudut Siku)',
                        selected: _mode == PushupDetectionMode.sideAngle,
                        onTap: () => setState(() {
                          _mode = PushupDetectionMode.sideAngle;
                          _isDown = false;
                          _depthProgress = 0.0;
                          _metricHistory.clear();
                        }),
                      ),
                      _buildModeTab(
                        label: '📱 Lantai (Dada/Wajah)',
                        selected: _mode == PushupDetectionMode.floorProximity,
                        onTap: () => setState(() {
                          _mode = PushupDetectionMode.floorProximity;
                          _isDown = false;
                          _depthProgress = 0.0;
                          _metricHistory.clear();
                        }),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Top-Center Posture Pill + Oversized Rep Counter (Stitch HUD)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: _isDown
                        ? AppColors.primaryContainer.withValues(alpha: 0.85)
                        : Colors.black.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: _isDown
                          ? AppColors.secondaryFixed
                          : Colors.white24,
                    ),
                  ),
                  child: Text(
                    _isDown
                        ? 'POSISI BAWAH VALID • DORONG NAIK ⬆️'
                        : 'SIAP • ${_activeArmLabel.toUpperCase()}',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                      color: _isDown ? AppColors.secondaryFixed : Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$_repCount',
                  style: TextStyle(
                    fontSize: 72,
                    fontWeight: FontWeight.w900,
                    height: 1.0,
                    letterSpacing: -2,
                    color: _isDown ? AppColors.secondaryFixed : Colors.white,
                    shadows: [
                      Shadow(
                        color: Colors.black.withValues(alpha: 0.6),
                        blurRadius: 18,
                      ),
                    ],
                  ),
                ),
                const Text(
                  'REPS • REPETISI SELESAI',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.6,
                    color: AppColors.secondaryFixed,
                  ),
                ),

                const Spacer(),

                // Mid-Stage Left/Right HUD Wings (Angle Gauge & Vertical Depth Bar)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      // Left Wing: Elbow Angle / Proximity Gauge Card
                      Container(
                        width: 108,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: Column(
                          children: [
                            Text(
                              _mode == PushupDetectionMode.sideAngle
                                  ? 'SUDUT SIKU'
                                  : 'JARAK DADA',
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.8,
                                color: Colors.white70,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _mode == PushupDetectionMode.sideAngle
                                  ? '${_currentMetric.toStringAsFixed(0)}°'
                                  : '${_currentMetric.toStringAsFixed(0)}%',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: _isDown
                                    ? AppColors.secondaryFixed
                                    : Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: _isDown
                                    ? AppColors.primaryContainer
                                    : Colors.white12,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                _isDown ? 'VALID' : ' PANTAU ',
                                style: const TextStyle(
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Right Wing: Vertical Depth Meter Bar
                      Container(
                        width: 78,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: Column(
                          children: [
                            const Text(
                              'KEDALAMAN',
                              style: TextStyle(
                                fontSize: 8.5,
                                fontWeight: FontWeight.w800,
                                color: Colors.white70,
                              ),
                            ),
                            const SizedBox(height: 8),
                            SizedBox(
                              height: 82,
                              width: 16,
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(99),
                                child: RotatedBox(
                                  quarterTurns: -1,
                                  child: LinearProgressIndicator(
                                    value: _depthProgress,
                                    backgroundColor: Colors.white24,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      _isDown
                                          ? AppColors.secondaryFixed
                                          : AppColors.primaryContainer,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${(_depthProgress * 100).toInt()}%',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: AppColors.secondaryFixed,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // 4. Bottom Docked Telemetry & Controls Card (Stitch HUD)
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF141B2B).withValues(alpha: 0.88),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(
                      color: _isDown
                          ? AppColors.secondaryFixed
                          : Colors.white.withValues(alpha: 0.16),
                      width: _isDown ? 1.8 : 1,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // 3-Option Segmented Difficulty Selector (Stitch Design)
                      Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.35),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Row(
                          children: PushupDifficulty.values.map((d) {
                            final isSel = _difficulty == d;
                            return Expanded(
                              child: GestureDetector(
                                onTap: () => setState(() => _difficulty = d),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 7,
                                  ),
                                  decoration: BoxDecoration(
                                    color: isSel
                                        ? AppColors.primaryContainer
                                        : Colors.transparent,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(
                                    d.label,
                                    textAlign: TextAlign.center,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: isSel
                                          ? FontWeight.w800
                                          : FontWeight.w600,
                                      color: isSel
                                          ? Colors.white
                                          : Colors.white70,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // 3-Column Live Telemetry Strip (Streak, Durasi, Kalori)
                      Row(
                        children: [
                          _buildTelemetryCell(
                            icon: Icons.local_fire_department_rounded,
                            iconColor: Colors.orangeAccent,
                            label: 'STREAK',
                            value: '${stats.currentStreak} Hari',
                          ),
                          const SizedBox(width: 8),
                          _buildTelemetryCell(
                            icon: Icons.timer_outlined,
                            iconColor: AppColors.secondaryFixed,
                            label: 'DURASI',
                            value: _formatDuration(_elapsedSeconds),
                          ),
                          const SizedBox(width: 8),
                          _buildTelemetryCell(
                            icon: Icons.bolt_rounded,
                            iconColor: const Color(0xFF38BDF8),
                            label: 'ENERGI',
                            value: '$kcalBurned kkal',
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Guidance text
                      Text(
                        _guidanceText,
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: Colors.white70,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Action Row: +1 Manual, Reset, Selesai & Simpan Sesi
                      Row(
                        children: [
                          OutlinedButton(
                            onPressed: () {
                              HapticFeedback.lightImpact();
                              setState(() => _repCount++);
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Colors.white24),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 14,
                              ),
                            ),
                            child: const Text('+1'),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton(
                            onPressed: () {
                              setState(() {
                                _repCount = 0;
                                _elapsedSeconds = 0;
                              });
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white70,
                              side: const BorderSide(color: Colors.white24),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 14,
                              ),
                            ),
                            child: const Icon(Icons.refresh_rounded, size: 18),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _isSaving ? null : _finishAndSave,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryContainer,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 14,
                                ),
                              ),
                              icon: _isSaving
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(
                                      Icons.check_circle_outline_rounded,
                                      size: 18,
                                    ),
                              label: Text(
                                _repCount > 0
                                    ? 'Simpan Sesi ($_repCount)'
                                    : 'Selesai',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHudCircleBtn({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.55),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white24),
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }

  Widget _buildTelemetryCell({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.35),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white12),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 12, color: iconColor),
                const SizedBox(width: 4),
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    color: Colors.white60,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              value,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModeTab({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryContainer : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : Colors.white70,
            fontSize: 11,
            fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
