import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_pose_detection/google_mlkit_pose_detection.dart';
import '../../../../app/theme/app_colors.dart';

class PosePainter extends CustomPainter {
  final List<Pose> poses;
  final Size imageSize;
  final InputImageRotation rotation;
  final CameraLensDirection cameraLensDirection;
  final bool isDownPosition;

  PosePainter({
    required this.poses,
    required this.imageSize,
    required this.rotation,
    required this.cameraLensDirection,
    required this.isDownPosition,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final jointColor = isDownPosition ? const Color(0xFF34D399) : Colors.white;
    final lineColor = isDownPosition ? const Color(0xFF10B981) : AppColors.primaryLight;

    final jointPaint = Paint()
      ..style = PaintingStyle.fill
      ..strokeWidth = 4.0
      ..color = jointColor;

    final linePaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round
      ..color = lineColor.withValues(alpha: 0.85);

    for (final pose in poses) {
      void drawLine(PoseLandmarkType type1, PoseLandmarkType type2) {
        final lm1 = pose.landmarks[type1];
        final lm2 = pose.landmarks[type2];
        if (lm1 == null || lm2 == null) return;
        if (lm1.likelihood < 0.45 || lm2.likelihood < 0.45) return;

        final p1 = _translatePoint(lm1.x, lm1.y, size);
        final p2 = _translatePoint(lm2.x, lm2.y, size);
        canvas.drawLine(p1, p2, linePaint);
      }

      // Upper body & arms (most important for push-ups)
      drawLine(PoseLandmarkType.leftShoulder, PoseLandmarkType.rightShoulder);
      drawLine(PoseLandmarkType.leftShoulder, PoseLandmarkType.leftElbow);
      drawLine(PoseLandmarkType.leftElbow, PoseLandmarkType.leftWrist);
      drawLine(PoseLandmarkType.rightShoulder, PoseLandmarkType.rightElbow);
      drawLine(PoseLandmarkType.rightElbow, PoseLandmarkType.rightWrist);

      // Torso & legs
      drawLine(PoseLandmarkType.leftShoulder, PoseLandmarkType.leftHip);
      drawLine(PoseLandmarkType.rightShoulder, PoseLandmarkType.rightHip);
      drawLine(PoseLandmarkType.leftHip, PoseLandmarkType.rightHip);
      drawLine(PoseLandmarkType.leftHip, PoseLandmarkType.leftKnee);
      drawLine(PoseLandmarkType.rightHip, PoseLandmarkType.rightKnee);

      // Draw key joints
      final keyTypes = [
        PoseLandmarkType.leftShoulder,
        PoseLandmarkType.rightShoulder,
        PoseLandmarkType.leftElbow,
        PoseLandmarkType.rightElbow,
        PoseLandmarkType.leftWrist,
        PoseLandmarkType.rightWrist,
        PoseLandmarkType.leftHip,
        PoseLandmarkType.rightHip,
      ];

      for (final type in keyTypes) {
        final lm = pose.landmarks[type];
        if (lm != null && lm.likelihood >= 0.45) {
          final p = _translatePoint(lm.x, lm.y, size);
          canvas.drawCircle(p, 6.0, jointPaint);
        }
      }
    }
  }

  Offset _translatePoint(double x, double y, Size canvasSize) {
    final bool isRotated = rotation == InputImageRotation.rotation90deg ||
        rotation == InputImageRotation.rotation270deg;

    final double imgWidth = isRotated ? imageSize.height : imageSize.width;
    final double imgHeight = isRotated ? imageSize.width : imageSize.height;

    double scaledX = x * canvasSize.width / imgWidth;
    final double scaledY = y * canvasSize.height / imgHeight;

    if (cameraLensDirection == CameraLensDirection.front) {
      scaledX = canvasSize.width - scaledX;
    }

    return Offset(scaledX, scaledY);
  }

  @override
  bool shouldRepaint(covariant PosePainter oldDelegate) {
    return oldDelegate.poses != poses ||
        oldDelegate.isDownPosition != isDownPosition ||
        oldDelegate.imageSize != imageSize;
  }
}

