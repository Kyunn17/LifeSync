import 'food_item_model.dart';

class AiMealBreakdownItem {
  final String item;
  final String portion;
  final double calories;
  final double proteins;
  final double carbohydrates;
  final double fat;

  const AiMealBreakdownItem({
    required this.item,
    required this.portion,
    required this.calories,
    this.proteins = 0.0,
    this.carbohydrates = 0.0,
    this.fat = 0.0,
  });

  factory AiMealBreakdownItem.fromJson(Map<String, dynamic> json) {
    return AiMealBreakdownItem(
      item: json['item']?.toString() ?? 'Item makanan',
      portion: json['portion']?.toString() ?? '1 porsi',
      calories: (json['calories'] as num?)?.toDouble() ?? 0.0,
      proteins: (json['proteins'] as num?)?.toDouble() ?? 0.0,
      carbohydrates: (json['carbohydrates'] as num?)?.toDouble() ?? 0.0,
      fat: (json['fat'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class AiMealScanResult {
  final String foodName;
  final double calories;
  final double proteins;
  final double carbohydrates;
  final double fat;
  final String servingSize;
  final double servings;
  final String confidence;
  final List<AiMealBreakdownItem> breakdown;
  final String? notes;

  const AiMealScanResult({
    required this.foodName,
    required this.calories,
    this.proteins = 0.0,
    this.carbohydrates = 0.0,
    this.fat = 0.0,
    this.servingSize = '1 porsi',
    this.servings = 1.0,
    this.confidence = 'medium',
    this.breakdown = const [],
    this.notes,
  });

  factory AiMealScanResult.fromJson(Map<String, dynamic> json) {
    final rawBreakdown = json['breakdown'] as List? ?? [];
    return AiMealScanResult(
      foodName: json['foodName']?.toString() ?? 'Makanan Terdeteksi AI',
      calories: (json['calories'] as num?)?.toDouble() ?? 0.0,
      proteins: (json['proteins'] as num?)?.toDouble() ?? 0.0,
      carbohydrates: (json['carbohydrates'] as num?)?.toDouble() ?? 0.0,
      fat: (json['fat'] as num?)?.toDouble() ?? 0.0,
      servingSize: json['servingSize']?.toString() ?? '1 porsi',
      servings: (json['servings'] as num?)?.toDouble() ?? 1.0,
      confidence: json['confidence']?.toString() ?? 'medium',
      breakdown: rawBreakdown
          .whereType<Map<String, dynamic>>()
          .map(AiMealBreakdownItem.fromJson)
          .toList(),
      notes: json['notes']?.toString(),
    );
  }

  FoodItem toFoodItem({
    String? customName,
    double? customCalories,
    double? customProteins,
    double? customCarbs,
    double? customFat,
    String? customServingSize,
  }) {
    return FoodItem(
      id: 'ai_${DateTime.now().millisecondsSinceEpoch}',
      name: customName?.trim().isNotEmpty == true ? customName!.trim() : foodName,
      brand: 'AI Scan (Gemini)',
      calories: customCalories ?? calories,
      proteins: customProteins ?? proteins,
      carbohydrates: customCarbs ?? carbohydrates,
      fat: customFat ?? fat,
      servingSize: customServingSize?.trim().isNotEmpty == true
          ? customServingSize!.trim()
          : servingSize,
      source: 'ai',
    );
  }
}
