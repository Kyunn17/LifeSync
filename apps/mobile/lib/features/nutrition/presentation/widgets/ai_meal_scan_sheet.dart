import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../app/theme/app_colors.dart';
import '../../../dashboard/providers/dashboard_provider.dart';
import '../../data/models/ai_meal_scan_model.dart';
import '../../data/models/meal_entry_model.dart';
import '../../providers/nutrition_provider.dart';

class AiMealScanSheet extends ConsumerStatefulWidget {
  final MealType initialMealType;

  const AiMealScanSheet({
    super.key,
    this.initialMealType = MealType.lunch,
  });

  @override
  ConsumerState<AiMealScanSheet> createState() => _AiMealScanSheetState();
}

class _AiMealScanSheetState extends ConsumerState<AiMealScanSheet> {
  final _picker = ImagePicker();
  final _notesController = TextEditingController();

  // Editable result controllers
  final _foodNameController = TextEditingController();
  final _caloriesController = TextEditingController();
  final _proteinsController = TextEditingController();
  final _carbsController = TextEditingController();
  final _fatController = TextEditingController();
  final _servingSizeController = TextEditingController();

  late MealType _selectedMealType;
  Uint8List? _imageBytes;
  String? _imageBase64;
  String _mimeType = 'image/jpeg';

  bool _isAnalyzing = false;
  bool _isSaving = false;
  String? _errorMessage;
  AiMealScanResult? _scanResult;

  @override
  void initState() {
    super.initState();
    _selectedMealType = widget.initialMealType;
  }

  @override
  void dispose() {
    _notesController.dispose();
    _foodNameController.dispose();
    _caloriesController.dispose();
    _proteinsController.dispose();
    _carbsController.dispose();
    _fatController.dispose();
    _servingSizeController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );
      if (picked == null) return;

      final bytes = await picked.readAsBytes();
      final lower = picked.name.toLowerCase();
      final mime = lower.endsWith('.png')
          ? 'image/png'
          : lower.endsWith('.webp')
              ? 'image/webp'
              : 'image/jpeg';

      setState(() {
        _imageBytes = bytes;
        _imageBase64 = base64Encode(bytes);
        _mimeType = mime;
        _errorMessage = null;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Gagal mengambil gambar: $e';
      });
    }
  }

  Future<void> _analyzeMeal() async {
    final notes = _notesController.text.trim();
    if (_imageBase64 == null && notes.isEmpty) {
      setState(() {
        _errorMessage =
            'Pilih foto makanan atau tulis deskripsi makanan terlebih dahulu.';
      });
      return;
    }

    FocusScope.of(context).unfocus();
    setState(() {
      _isAnalyzing = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(nutritionRepositoryProvider);
      final result = await repo.scanMealWithAi(
        imageBase64: _imageBase64,
        mimeType: _mimeType,
        notes: notes,
      );

      if (!mounted) return;
      setState(() {
        _scanResult = result;
        _foodNameController.text = result.foodName;
        _caloriesController.text = result.calories.toInt().toString();
        _proteinsController.text = result.proteins.toStringAsFixed(1);
        _carbsController.text = result.carbohydrates.toStringAsFixed(1);
        _fatController.text = result.fat.toStringAsFixed(1);
        _servingSizeController.text = result.servingSize;
        _isAnalyzing = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isAnalyzing = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _saveMeal() async {
    final result = _scanResult;
    if (result == null) return;

    setState(() => _isSaving = true);

    final foodItem = result.toFoodItem(
      customName: _foodNameController.text,
      customCalories: double.tryParse(_caloriesController.text.trim()),
      customProteins: double.tryParse(_proteinsController.text.trim()),
      customCarbs: double.tryParse(_carbsController.text.trim()),
      customFat: double.tryParse(_fatController.text.trim()),
      customServingSize: _servingSizeController.text,
    );

    final messenger = ScaffoldMessenger.of(context);
    final nav = Navigator.of(context);

    await ref.read(dailyNutritionProvider.notifier).addMeal(
          mealType: _selectedMealType,
          food: foodItem,
          servings: 1.0,
        );

    ref.invalidate(dailyAnalyticsProvider);

    if (!mounted) return;
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          'AI Scan disimpan: ${foodItem.name} (${foodItem.calories.toInt()} kkal)',
        ),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
      ),
    );
    nav.pop(true);
  }

  Color _confidenceColor(String confidence) {
    switch (confidence.toLowerCase()) {
      case 'high':
        return AppColors.primary;
      case 'low':
        return AppColors.error;
      default:
        return AppColors.tertiary;
    }
  }

  String _confidenceLabel(String confidence) {
    switch (confidence.toLowerCase()) {
      case 'high':
        return 'Akurasi Tinggi';
      case 'low':
        return 'Perkiraan Kasar';
      default:
        return 'Akurasi Sedang';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      padding: EdgeInsets.only(top: 14, bottom: bottomInset),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.outlineVariant,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(
                    Icons.auto_awesome_rounded,
                    color: AppColors.primary,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'AI Calorie Scanner',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.onSurface,
                        ),
                      ),
                      const Text(
                        'Foto makanan atau ketik menu yang Anda makan',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
              child: _scanResult == null
                  ? _buildInputView(theme)
                  : _buildResultView(theme, _scanResult!),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputView(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Meal Type Selector
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: MealType.values.map((type) {
              final selected = type == _selectedMealType;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(type.label),
                  selected: selected,
                  selectedColor: AppColors.primary.withValues(alpha: 0.18),
                  onSelected: (_) => setState(() => _selectedMealType = type),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),

        // Image Preview or Picker Card
        Container(
          height: 190,
          decoration: BoxDecoration(
            color: AppColors.surfaceContainerLow,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.outlineVariant),
          ),
          clipBehavior: Clip.antiAlias,
          child: _imageBytes != null
              ? Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.memory(_imageBytes!, fit: BoxFit.cover),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: CircleAvatar(
                        backgroundColor: Colors.black54,
                        child: IconButton(
                          icon: const Icon(
                            Icons.delete_outline_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                          onPressed: () => setState(() {
                            _imageBytes = null;
                            _imageBase64 = null;
                          }),
                        ),
                      ),
                    ),
                  ],
                )
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.restaurant_menu_rounded,
                      size: 40,
                      color: AppColors.onSurfaceVariant,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Ambil atau pilih foto makanan',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        FilledButton.tonalIcon(
                          onPressed: () => _pickImage(ImageSource.camera),
                          icon: const Icon(Icons.camera_alt_rounded, size: 18),
                          label: const Text('Kamera'),
                        ),
                        const SizedBox(width: 12),
                        OutlinedButton.icon(
                          onPressed: () => _pickImage(ImageSource.gallery),
                          icon: const Icon(Icons.photo_library_rounded, size: 18),
                          label: const Text('Galeri'),
                        ),
                      ],
                    ),
                  ],
                ),
        ),
        const SizedBox(height: 16),

        // Notes / Text Description
        TextField(
          controller: _notesController,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: 'Deskripsi atau Catatan Tambahan',
            hintText:
                'Contoh: Nasi goreng telur ceplok, nasinya setengah porsi, sama es teh manis',
            alignLabelWithHint: true,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),

        if (_errorMessage != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.error.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: AppColors.error, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: AppColors.error, fontSize: 12.5),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 20),

        FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          onPressed: _isAnalyzing ? null : _analyzeMeal,
          icon: _isAnalyzing
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.auto_awesome_rounded),
          label: Text(
            _isAnalyzing
                ? 'AI Sedang Menganalisis...'
                : 'Analisis Kalori dengan AI',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
        ),
      ],
    );
  }

  Widget _buildResultView(ThemeData theme, AiMealScanResult result) {
    final confColor = _confidenceColor(result.confidence);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Confidence & Re-scan bar
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: confColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                _confidenceLabel(result.confidence),
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: confColor,
                ),
              ),
            ),
            TextButton.icon(
              onPressed: () => setState(() => _scanResult = null),
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Scan Ulang'),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // Editable Fields
        TextField(
          controller: _foodNameController,
          decoration: InputDecoration(
            labelText: 'Nama Makanan',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _caloriesController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Kalori (kkal)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _servingSizeController,
                decoration: InputDecoration(
                  labelText: 'Porsi',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _proteinsController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Protein (g)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _carbsController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Karbo (g)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _fatController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Lemak (g)',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ],
        ),

        if (result.breakdown.isNotEmpty) ...[
          const SizedBox(height: 18),
          Text(
            'Rincian Komponen Makanan',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          ...result.breakdown.map(
            (item) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.surfaceContainerLow,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.item,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 13.5,
                          ),
                        ),
                        Text(
                          '${item.portion} • P:${item.proteins}g K:${item.carbohydrates}g L:${item.fat}g',
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    '${item.calories.toInt()} kkal',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],

        if (result.notes != null && result.notes!.trim().isNotEmpty) ...[
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.secondaryFixed.withValues(alpha: 0.45),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.lightbulb_outline_rounded,
                  size: 18,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    result.notes!,
                    style: const TextStyle(fontSize: 12.5),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 20),

        FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primary,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          onPressed: _isSaving ? null : _saveMeal,
          icon: _isSaving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.check_circle_outline_rounded),
          label: Text(
            _isSaving
                ? 'Menyimpan...'
                : 'Simpan ke ${_selectedMealType.label}',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
        ),
      ],
    );
  }
}
