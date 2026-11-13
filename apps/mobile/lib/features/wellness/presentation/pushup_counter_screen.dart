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

  // Push-up state machine
  PushupDetectionMode _mode = PushupDetectionMode.sideAngle;
  int _repCount = 0;
  bool _isDown = false;
  double _currentMetric = 0; // Elbow angle in degrees OR shoulder width ratio
  String _guidanceText = 'Posisikan tubuh dalam bingkai kamera';
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
          _errorMessage = 'Izin kamera diperlukan untuk mendeteksi gerakan push-up secara otomatis.';
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

      // Prefer front camera by default so user can see the counter
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
    final sensorOrientation = camera.sensorOrientation;

    InputImageRotation? rotation;
    if (Platform.isIOS) {
      rotation = InputImageRotationValue.fromRawValue(sensorOrientation);
    } else if (Platform.isAndroid) {
      var rotationCompensation = _orientations[controller.value.deviceOrientation] ?? 0;
      if (camera.lensDirection == CameraLensDirection.front) {
        rotationCompensation = (sensorOrientation + rotationCompensation) % 360;
      } else {
        rotationCompensation = (sensorOrientation - rotationCompensation + 360) % 360;
      }
      rotation = InputImageRotationValue.fromRawValue(rotationCompensation);
    }

    if (rotation == null) return null;

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

  static const _orientations = {
    DeviceOrientation.portraitUp: 0,
    DeviceOrientation.landscapeLeft: 90,
    DeviceOrientation.portraitDown: 180,
    DeviceOrientation.landscapeRight: 270,
  };

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
        inputImage.metadata?.size ?? Size(image.width.toDouble(), image.height.toDouble()),
        inputImage.metadata?.rotation ?? InputImageRotation.rotation0deg,
      );
    } catch (_) {
      // Ignore transient frame errors
    } finally {
      _isProcessingFrame = false;
    }
  }

  void _evaluatePushupPose(List<Pose> poses, Size imgSize, InputImageRotation rotation) {
    String guidance = _guidanceText;
    double metric = _currentMetric;
    bool downState = _isDown;
    int reps = _repCount;

    if (poses.isEmpty) {
      guidance = 'Tubuh belum terdeteksi. Pastikan pencahayaan cukup.';
    } else {
      final pose = poses.first;

      if (_mode == PushupDetectionMode.sideAngle) {
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
          if (leftConf >= 0.45) {
            leftAngle = _calculateAngle(lShoulder, lElbow, lWrist);
          }
        }

        double? rightAngle;
        double rightConf = 0;
        if (rShoulder != null && rElbow != null && rWrist != null) {
          rightConf = (rShoulder.likelihood + rElbow.likelihood + rWrist.likelihood) / 3;
          if (rightConf >= 0.45) {
            rightAngle = _calculateAngle(rShoulder, rElbow, rWrist);
          }
        }

        final angle = (leftConf >= rightConf) ? (leftAngle ?? rightAngle) : (rightAngle ?? leftAngle);

        if (angle == null) {
          guidance = 'Arahkan bahu, siku & tangan agar terlihat di kamera';
        } else {
          metric = angle;
          if (angle <= 95) {
            if (!downState) {
              HapticFeedback.selectionClick();
            }
            downState = true;
            guidance = 'Bagus! Sekarang dorong naik ⬆️';
          } else if (angle >= 155) {
            if (downState) {
              reps += 1;
              downState = false;
              HapticFeedback.mediumImpact();
              guidance = 'Mantap! +1 Repetisi 🔥';
            } else {
              guidance = 'Siap! Turunkan badan hingga siku menekuk';
            }
          } else {
            guidance = downState ? 'Terus dorong ke atas...' : 'Turun lebih rendah lagi ⬇️';
          }
        }
      } else {
        // Floor Proximity Mode: HP diletakkan di lantai di bawah dada/wajah
        final lShoulder = pose.landmarks[PoseLandmarkType.leftShoulder];
        final rShoulder = pose.landmarks[PoseLandmarkType.rightShoulder];

        if (lShoulder == null ||
            rShoulder == null ||
            lShoulder.likelihood < 0.45 ||
            rShoulder.likelihood < 0.45) {
          guidance = 'Letakkan HP di lantai di bawah bahu/wajah Anda';
        } else {
          final isRotated = rotation == InputImageRotation.rotation90deg ||
              rotation == InputImageRotation.rotation270deg;
          final effectiveWidth = isRotated ? imgSize.height : imgSize.width;
          final shoulderSpan = (lShoulder.x - rShoulder.x).abs();
          final ratio = effectiveWidth > 0 ? (shoulderSpan / effectiveWidth) : 0.0;
          metric = ratio * 100;

          if (ratio >= 0.46) {
            if (!downState) {
              HapticFeedback.selectionClick();
            }
            downState = true;
            guidance = 'Posisi bawah tercapai! Dorong naik ⬆️';
          } else if (ratio <= 0.34) {
            if (downState) {
              reps += 1;
              downState = false;
              HapticFeedback.mediumImpact();
              guidance = 'Mantap! +1 Repetisi 🔥';
            } else {
              guidance = 'Siap! Turunkan dada mendekati kamera';
            }
          } else {
            guidance = downState ? 'Dorong naik ke posisi plank...' : 'Turunkan badan mendekati HP ⬇️';
          }
        }
      }
    }

    setState(() {
      _detectedPoses = poses;
      _imageSize = imgSize;
      _imageRotation = rotation;
      _currentMetric = metric;
      _isDown = downState;
      _repCount = reps;
      _guidanceText = guidance;
    });
  }

  double _calculateAngle(PoseLandmark a, PoseLandmark b, PoseLandmark c) {
    final radians = math.atan2(c.y - b.y, c.x - b.x) - math.atan2(a.y - b.y, a.x - b.x);
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
          content: Text('Keren! $_repCount push-up disimpan • Streak: $newStreak Hari 🔥'),
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

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Camera Preview + Skeleton Overlay
          if (_isInitializing)
            const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: AppColors.primaryLight),
                  SizedBox(height: 12),
                  Text('Menyiapkan AI Kamera...', style: TextStyle(color: Colors.white)),
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
                    const Icon(Icons.videocam_off_rounded, size: 56, color: Colors.white54),
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
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                      child: const Text('Buka Pengaturan Izin', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              ),
            )
          else if (_cameraController != null && _cameraController!.value.isInitialized)
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
                          cameraLensDirection: _cameras[_selectedCameraIndex].lensDirection,
                          isDownPosition: _isDown,
                        ),
                      ),
                  ],
                ),
              ),
            ),

          // 2. Top Controls Overlay
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      CircleAvatar(
                        backgroundColor: Colors.black54,
                        child: IconButton(
                          icon: const Icon(Icons.close_rounded, color: Colors.white),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.local_fire_department_rounded,
                                size: 18, color: Colors.orangeAccent),
                            const SizedBox(width: 6),
                            Text(
                              'Streak: ${stats.currentStreak} Hari',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (_cameras.length > 1)
                        CircleAvatar(
                          backgroundColor: Colors.black54,
                          child: IconButton(
                            icon: const Icon(Icons.cameraswitch_rounded, color: Colors.white),
                            onPressed: _switchCamera,
                          ),
                        )
                      else
                        const SizedBox(width: 40),
                    ],
                  ),
                ),

                // Mode Switcher Pill
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _buildModeTab(
                        label: '📐 Sandaran (Siku)',
                        selected: _mode == PushupDetectionMode.sideAngle,
                        onTap: () => setState(() {
                          _mode = PushupDetectionMode.sideAngle;
                          _isDown = false;
                        }),
                      ),
                      _buildModeTab(
                        label: '📱 Lantai (Dada/Wajah)',
                        selected: _mode == PushupDetectionMode.floorProximity,
                        onTap: () => setState(() {
                          _mode = PushupDetectionMode.floorProximity;
                          _isDown = false;
                        }),
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                // 3. Bottom Live Counter & Controls HUD
                Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.78),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(
                      color: _isDown ? const Color(0xFF34D399) : Colors.white24,
                      width: _isDown ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Guidance Pill
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: _isDown
                              ? const Color(0xFF10B981).withValues(alpha: 0.25)
                              : Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _guidanceText,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: _isDown ? const Color(0xFF6EE7B7) : Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Giant Counter + Metrics Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          Column(
                            children: [
                              Text(
                                _formatDuration(_elapsedSeconds),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const Text(
                                'Durasi',
                                style: TextStyle(color: Colors.white60, fontSize: 11),
                              ),
                            ],
                          ),
                          Column(
                            children: [
                              Text(
                                '$_repCount',
                                style: TextStyle(
                                  color: _isDown ? const Color(0xFF34D399) : Colors.white,
                                  fontSize: 56,
                                  fontWeight: FontWeight.w900,
                                  height: 1.0,
                                ),
                              ),
                              const Text(
                                'PUSH-UP',
                                style: TextStyle(
                                  color: AppColors.primaryLight,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.5,
                                ),
                              ),
                            ],
                          ),
                          Column(
                            children: [
                              Text(
                                _mode == PushupDetectionMode.sideAngle
                                    ? '${_currentMetric.toStringAsFixed(0)}°'
                                    : '${_currentMetric.toStringAsFixed(0)}%',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                _mode == PushupDetectionMode.sideAngle ? 'Sudut Siku' : 'Kedekatan',
                                style: const TextStyle(color: Colors.white60, fontSize: 11),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      // Action Buttons
                      Row(
                        children: [
                          // Manual +1 fallback
                          OutlinedButton(
                            onPressed: () {
                              HapticFeedback.lightImpact();
                              setState(() => _repCount++);
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Colors.white30),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: const Text('+1'),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _isSaving ? null : _finishAndSave,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
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
                                  : const Icon(Icons.check_circle_outline_rounded),
                              label: Text(
                                _repCount > 0 ? 'Simpan ($_repCount Push-Up)' : 'Tutup',
                                style: const TextStyle(fontWeight: FontWeight.bold),
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
          color: selected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : Colors.white70,
            fontSize: 11,
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

