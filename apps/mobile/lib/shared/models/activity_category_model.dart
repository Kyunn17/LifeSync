import 'package:flutter/material.dart';

class ActivityCategoryModel {
  final String id;
  final String name;
  final String slug;
  final String colorHex;
  final String bgColorHex;
  final String icon;
  final int targetMinutesPerDay;
  final bool isSystem;

  ActivityCategoryModel({
    required this.id,
    required this.name,
    required this.slug,
    required this.colorHex,
    required this.bgColorHex,
    required this.icon,
    this.targetMinutesPerDay = 60,
    this.isSystem = true,
  });

  Color get color {
    try {
      final hex = colorHex.replaceFirst('#', '');
      return Color(int.parse('FF$hex', radix: 16));
    } catch (_) {
      return const Color(0xFF0D7A53);
    }
  }

  Color get bgColor {
    try {
      final hex = bgColorHex.replaceFirst('#', '');
      return Color(int.parse('FF$hex', radix: 16));
    } catch (_) {
      return const Color(0xFFEEF4FF);
    }
  }

  factory ActivityCategoryModel.fromJson(Map<String, dynamic> json) {
    return ActivityCategoryModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      colorHex: json['color']?.toString() ?? '#0D7A53',
      bgColorHex: json['bgColor']?.toString() ?? '#EEF4FF',
      icon: json['icon']?.toString() ?? 'schedule',
      targetMinutesPerDay: (json['targetMinutesPerDay'] as num?)?.toInt() ?? 60,
      isSystem: json['isSystem'] == true || json['is_system'] == true,
    );
  }
}

