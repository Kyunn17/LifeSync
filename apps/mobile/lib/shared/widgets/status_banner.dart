import 'package:flutter/material.dart';
import '../../app/theme/app_colors.dart';

enum BannerType { error, success, info }

class StatusBanner extends StatelessWidget {
  final String message;
  final BannerType type;
  final VoidCallback? onDismiss;

  const StatusBanner({
    super.key,
    required this.message,
    this.type = BannerType.info,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    IconData icon;

    switch (type) {
      case BannerType.error:
        bg = AppColors.errorContainer;
        fg = AppColors.onErrorContainer;
        icon = Icons.error_outline_rounded;
        break;
      case BannerType.success:
        bg = AppColors.successContainer;
        fg = AppColors.success;
        icon = Icons.check_circle_outline_rounded;
        break;
      case BannerType.info:
        bg = AppColors.secondaryContainer;
        fg = AppColors.onSecondaryContainer;
        icon = Icons.info_outline_rounded;
        break;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(icon, color: fg, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: fg,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          if (onDismiss != null)
            GestureDetector(
              onTap: onDismiss,
              child: Icon(Icons.close, color: fg, size: 18),
            ),
        ],
      ),
    );
  }
}

