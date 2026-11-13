class FoodItem {
  final String id;
  final String name;
  final String? brand;
  final double calories; // kkal per serving
  final double proteins; // grams
  final double carbohydrates; // grams
  final double fat; // grams
  final String servingSize; // e.g. "1 porsi (100g)"
  final String? imageUrl;
  final String source; // 'local', 'openfoodfacts', 'manual'

  const FoodItem({
    required this.id,
    required this.name,
    this.brand,
    required this.calories,
    this.proteins = 0.0,
    this.carbohydrates = 0.0,
    this.fat = 0.0,
    this.servingSize = '1 porsi',
    this.imageUrl,
    this.source = 'manual',
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'brand': brand,
      'calories': calories,
      'proteins': proteins,
      'carbohydrates': carbohydrates,
      'fat': fat,
      'servingSize': servingSize,
      'imageUrl': imageUrl,
      'source': source,
    };
  }

  factory FoodItem.fromJson(Map<String, dynamic> json) {
    return FoodItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Makanan',
      brand: json['brand']?.toString(),
      calories: (json['calories'] as num?)?.toDouble() ?? 0.0,
      proteins: (json['proteins'] as num?)?.toDouble() ?? 0.0,
      carbohydrates: (json['carbohydrates'] as num?)?.toDouble() ?? 0.0,
      fat: (json['fat'] as num?)?.toDouble() ?? 0.0,
      servingSize: json['servingSize']?.toString() ?? '1 porsi',
      imageUrl: json['imageUrl']?.toString(),
      source: json['source']?.toString() ?? 'manual',
    );
  }

  factory FoodItem.fromOpenFoodFacts(Map<String, dynamic> json) {
    final nutriments = json['nutriments'] as Map<String, dynamic>? ?? {};

    // Open Food Facts can have energy in kcal or kj
    double calories = (nutriments['energy-kcal_serving'] as num?)?.toDouble() ??
        (nutriments['energy-kcal_100g'] as num?)?.toDouble() ??
        ((nutriments['energy_serving'] as num?)?.toDouble() ??
                (nutriments['energy_100g'] as num?)?.toDouble() ??
                0.0) /
            4.184;

    double proteins = (nutriments['proteins_serving'] as num?)?.toDouble() ??
        (nutriments['proteins_100g'] as num?)?.toDouble() ??
        0.0;

    double carbs = (nutriments['carbohydrates_serving'] as num?)?.toDouble() ??
        (nutriments['carbohydrates_100g'] as num?)?.toDouble() ??
        0.0;

    double fat = (nutriments['fat_serving'] as num?)?.toDouble() ??
        (nutriments['fat_100g'] as num?)?.toDouble() ??
        0.0;

    final productName = json['product_name_id']?.toString().isNotEmpty == true
        ? json['product_name_id'].toString()
        : (json['product_name']?.toString().isNotEmpty == true
            ? json['product_name'].toString()
            : (json['product_name_en']?.toString() ?? 'Produk Makanan'));

    final servingSize = json['serving_size']?.toString().isNotEmpty == true
        ? json['serving_size'].toString()
        : '1 porsi (100g)';

    return FoodItem(
      id: json['code']?.toString() ?? json['_id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      name: productName,
      brand: json['brands']?.toString(),
      calories: calories.clamp(0.0, 5000.0),
      proteins: proteins.clamp(0.0, 500.0),
      carbohydrates: carbs.clamp(0.0, 500.0),
      fat: fat.clamp(0.0, 500.0),
      servingSize: servingSize,
      imageUrl: json['image_front_small_url']?.toString() ??
          (json['selected_images']?['front']?['small']?['fr']?.toString()),
      source: 'openfoodfacts',
    );
  }
}

