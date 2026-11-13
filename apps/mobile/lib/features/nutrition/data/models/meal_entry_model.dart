import 'food_item_model.dart';

enum MealType {
  breakfast('breakfast', 'Sarapan', '🌅'),
  lunch('lunch', 'Makan Siang', '☀️'),
  dinner('dinner', 'Makan Malam', '🌙'),
  snack('snack', 'Camilan', '🍎');

  final String key;
  final String label;
  final String icon;

  const MealType(this.key, this.label, this.icon);

  static MealType fromKey(String key) {
    switch (key.toLowerCase()) {
      case 'breakfast':
      case 'sarapan':
        return MealType.breakfast;
      case 'lunch':
      case 'makan siang':
        return MealType.lunch;
      case 'dinner':
      case 'makan malam':
        return MealType.dinner;
      case 'snack':
      case 'camilan':
      default:
        return MealType.snack;
    }
  }
}

class MealEntry {
  final String id;
  final String date; // YYYY-MM-DD
  final MealType mealType;
  final FoodItem food;
  final double servings; // e.g. 1.0, 1.5, 2.0
  final DateTime loggedAt;

  const MealEntry({
    required this.id,
    required this.date,
    required this.mealType,
    required this.food,
    this.servings = 1.0,
    required this.loggedAt,
  });

  double get totalCalories => food.calories * servings;
  double get totalProteins => food.proteins * servings;
  double get totalCarbs => food.carbohydrates * servings;
  double get totalFat => food.fat * servings;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'date': date,
      'mealType': mealType.key,
      'food': food.toJson(),
      'servings': servings,
      'loggedAt': loggedAt.toIso8601String(),
    };
  }

  factory MealEntry.fromJson(Map<String, dynamic> json) {
    return MealEntry(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      date: json['date']?.toString() ?? '',
      mealType: MealType.fromKey(json['mealType']?.toString() ?? 'snack'),
      food: FoodItem.fromJson(json['food'] as Map<String, dynamic>? ?? {}),
      servings: (json['servings'] as num?)?.toDouble() ?? 1.0,
      loggedAt: DateTime.tryParse(json['loggedAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

