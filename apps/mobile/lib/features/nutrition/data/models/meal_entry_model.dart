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

  Map<String, dynamic> toApiJson() {
    return {
      'id': id,
      'date': date,
      'mealType': mealType.key,
      'foodId': food.id,
      'foodName': food.name,
      'brand': food.brand,
      'calories': food.calories,
      'proteins': food.proteins,
      'carbohydrates': food.carbohydrates,
      'fat': food.fat,
      'servingSize': food.servingSize,
      'servings': servings,
      'imageUrl': food.imageUrl,
      'source': food.source,
      'loggedAt': loggedAt.toIso8601String(),
    };
  }

  factory MealEntry.fromJson(Map<String, dynamic> json) {
    if (json.containsKey('food') && json['food'] is Map<String, dynamic>) {
      return MealEntry(
        id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
        date: json['date']?.toString() ?? '',
        mealType: MealType.fromKey(json['mealType']?.toString() ?? 'snack'),
        food: FoodItem.fromJson(json['food'] as Map<String, dynamic>),
        servings: (json['servings'] as num?)?.toDouble() ?? 1.0,
        loggedAt: DateTime.tryParse(json['loggedAt']?.toString() ?? '') ?? DateTime.now(),
      );
    }
    return MealEntry.fromBackend(json);
  }

  factory MealEntry.fromBackend(Map<String, dynamic> json) {
    final food = FoodItem(
      id: json['foodId']?.toString() ?? json['food_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['foodName']?.toString() ?? json['food_name']?.toString() ?? 'Makanan',
      brand: json['brand']?.toString(),
      calories: (json['calories'] as num?)?.toDouble() ?? 0.0,
      proteins: (json['proteins'] as num?)?.toDouble() ?? 0.0,
      carbohydrates: (json['carbohydrates'] as num?)?.toDouble() ?? 0.0,
      fat: (json['fat'] as num?)?.toDouble() ?? 0.0,
      servingSize: json['servingSize']?.toString() ?? json['serving_size']?.toString() ?? '1 porsi',
      imageUrl: json['imageUrl']?.toString() ?? json['image_url']?.toString(),
      source: json['source']?.toString() ?? 'manual',
    );

    return MealEntry(
      id: json['id']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      mealType: MealType.fromKey(json['mealType']?.toString() ?? json['meal_type']?.toString() ?? 'snack'),
      food: food,
      servings: (json['servings'] as num?)?.toDouble() ?? 1.0,
      loggedAt: DateTime.tryParse(json['loggedAt']?.toString() ?? json['logged_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

