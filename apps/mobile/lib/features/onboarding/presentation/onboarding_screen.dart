import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../auth/providers/auth_provider.dart';
import '../../dashboard/providers/dashboard_provider.dart';
import '../../insights/providers/insights_provider.dart';
import '../../nutrition/providers/nutrition_provider.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _currentStep = 0;
  bool _isSaving = false;
  String? _errorMessage;

  // Step 1: Physical Profile
  String _gender = 'MALE';
  int _age = 25;
  double _weightKg = 65.0;
  double _heightCm = 170.0;

  // Step 2: NEAT, Fitness Level & Goal
  String _neatLevel = 'MODERATE';
  String _fitnessGoal = 'CUTTING';
  String _fitnessLevel = 'BEGINNER';

  // Step 3: Medical Conditions (templates + custom)
  final Set<String> _selectedConditions = {};
  final TextEditingController _customConditionCtrl = TextEditingController();

  static const _neatOptions = [
    (
      id: 'SEDENTARY',
      title: 'Sedentari (Kantoran / Minim Gerak)',
      desc: 'Banyak duduk, olahraga < 1x/minggu',
      mult: 1.2,
      icon: Icons.chair_outlined,
    ),
    (
      id: 'LIGHT',
      title: 'Aktivitas Ringan',
      desc: 'Jalan santai atau olahraga ringan 1-3 hari/minggu',
      mult: 1.375,
      icon: Icons.directions_walk_rounded,
    ),
    (
      id: 'MODERATE',
      title: 'Aktif Bergerak (Moderat)',
      desc: 'Mobilitas harian cukup tinggi / olahraga 3-5 hari',
      mult: 1.55,
      icon: Icons.directions_run_rounded,
    ),
    (
      id: 'ACTIVE',
      title: 'Sangat Aktif',
      desc: 'Kerja lapangan / latihan fisik rutin 6-7 hari',
      mult: 1.725,
      icon: Icons.fitness_center_rounded,
    ),
    (
      id: 'VERY_ACTIVE',
      title: 'Ekstra Aktif / Pekerja Fisik',
      desc: 'Aktivitas fisik berat hampir sepanjang hari',
      mult: 1.9,
      icon: Icons.bolt_rounded,
    ),
  ];

  static const _goalOptions = [
    (
      id: 'CUTTING',
      title: 'Cutting (Turun Berat Badan)',
      desc: 'Defisit kalori sehat (-400 kkal) & jaga protein',
      icon: Icons.trending_down_rounded,
    ),
    (
      id: 'MAINTENANCE',
      title: 'Maintenance (Jaga Kebugaran)',
      desc: 'Seimbangkan kalori masuk & energi harian',
      icon: Icons.balance_rounded,
    ),
    (
      id: 'BULKING',
      title: 'Bulking (Bentuk Otot)',
      desc: 'Surplus terkontrol (+350 kkal) & target kekuatan',
      icon: Icons.fitness_center_rounded,
    ),
    (
      id: 'ENDURANCE',
      title: 'Endurance (Stamina & Kardio)',
      desc: 'Optimasi langkah, hidrasi, & daya tahan',
      icon: Icons.directions_bike_rounded,
    ),
  ];

  static const _levelOptions = [
    (id: 'BEGINNER', title: 'Pemula', sub: 'Baru mulai rutin'),
    (id: 'INTERMEDIATE', title: 'Menengah', sub: 'Sudah terbiasa'),
    (id: 'ADVANCED', title: 'Mahir', sub: 'Intensitas tinggi'),
  ];

  static const _conditionTemplates = [
    (id: 'ASTHMA', label: 'Asma / Pernapasan'),
    (id: 'JOINT_PAIN', label: 'Nyeri Sendi / Lutut'),
    (id: 'BACK_INJURY', label: 'Cedera Punggung'),
    (id: 'HEART_CONDITION', label: 'Riwayat Jantung'),
    (id: 'HYPERTENSION', label: 'Hipertensi / Darah Tinggi'),
    (id: 'DIABETES', label: 'Diabetes / Gula Darah'),
    (id: 'VERTIGO', label: 'Vertigo'),
    (id: 'PREGNANCY', label: 'Sedang Hamil'),
  ];

  @override
  void initState() {
    super.initState();
    final profile = ref.read(authStateProvider).user?.profile;
    if (profile != null) {
      _gender = profile.gender;
      _age = profile.age;
      _weightKg = profile.weightKg;
      _heightCm = profile.heightCm;
      _neatLevel = profile.neatLevel;
      _fitnessGoal = profile.fitnessGoal;
      _fitnessLevel = profile.fitnessLevel;
      _selectedConditions.addAll(
        profile.medicalConditions.where((c) => c != 'NONE'),
      );
      _customConditionCtrl.text = profile.customMedicalCondition ?? '';
    }
  }

  @override
  void dispose() {
    _customConditionCtrl.dispose();
    super.dispose();
  }

  // Mirror of backend formula for live preview on Step 1 & Step 4
  double get _bmi {
    final hM = _heightCm / 100.0;
    return _weightKg / (hM * hM);
  }

  String get _bmiLabel {
    final b = _bmi;
    if (b < 18.5) return 'Kurus (Underweight)';
    if (b < 25.0) return 'Ideal (Normal)';
    if (b < 30.0) return 'Berlebih (Overweight)';
    return 'Obesitas';
  }

  Map<String, dynamic> _previewPlan() {
    final baseBmr = (10 * _weightKg) + (6.25 * _heightCm) - (5 * _age);
    final bmr = (_gender == 'MALE' ? baseBmr + 5 : baseBmr - 161).round();
    final mult = _neatOptions
        .firstWhere((e) => e.id == _neatLevel, orElse: () => _neatOptions[2])
        .mult;
    final tdee = (bmr * mult).round();

    final hasCardiac = _selectedConditions.contains('HEART_CONDITION');
    final hasJoint = _selectedConditions.contains('JOINT_PAIN');
    final hasBack = _selectedConditions.contains('BACK_INJURY');
    final hasPregnancy = _selectedConditions.contains('PREGNANCY');
    final hasDiabetes = _selectedConditions.contains('DIABETES');
    final needsCap = hasCardiac || hasJoint || hasBack || hasPregnancy;

    int cal = tdee;
    if (_fitnessGoal == 'CUTTING') {
      final deficit = (hasDiabetes || hasPregnancy) ? 200 : 400;
      final floor = _gender == 'MALE' ? 1400 : 1200;
      cal = (tdee - deficit).clamp(floor, 10000);
    } else if (_fitnessGoal == 'BULKING') {
      cal = tdee + 350;
    } else if (_fitnessGoal == 'ENDURANCE') {
      cal = tdee + 200;
    }

    int water = ((_weightKg * 35) / 50).round() * 50;
    if (_neatLevel == 'MODERATE') water += 300;
    if (_neatLevel == 'ACTIVE' || _neatLevel == 'VERY_ACTIVE') water += 500;
    water = water.clamp(1500, 5000);

    final stepsMap = {
      'SEDENTARY': 6000,
      'LIGHT': 7500,
      'MODERATE': 9500,
      'ACTIVE': 11500,
      'VERY_ACTIVE': 13000,
    };
    int steps = stepsMap[_neatLevel] ?? 9500;
    if (needsCap && steps > 6000) steps = 6000;

    final pushupBase =
        _fitnessLevel == 'ADVANCED' ? 60 : (_fitnessLevel == 'INTERMEDIATE' ? 35 : 15);
    final weightScale = (70.0 / _weightKg).clamp(0.7, 1.3);
    int pushups = (pushupBase * weightScale).round().clamp(5, 200);
    int exMinutes =
        _fitnessLevel == 'ADVANCED' ? 60 : (_fitnessLevel == 'INTERMEDIATE' ? 45 : 30);

    if (needsCap) {
      pushups = (pushups * 0.5).round().clamp(5, 100);
      if (exMinutes > 30) exMinutes = 30;
    }

    return {
      'bmr': bmr,
      'tdee': tdee,
      'calories': cal,
      'water': water,
      'steps': steps,
      'pushups': pushups,
      'exerciseMinutes': exMinutes,
      'needsCap': needsCap,
    };
  }

  Future<void> _submitOnboarding() async {
    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final conditions = _selectedConditions.isEmpty
          ? ['NONE']
          : _selectedConditions.toList();
      final customText = _customConditionCtrl.text.trim();

      final updatedUser = await ref
          .read(authStateProvider.notifier)
          .completeOnboarding({
        'gender': _gender,
        'age': _age,
        'weightKg': double.parse(_weightKg.toStringAsFixed(1)),
        'heightCm': double.parse(_heightCm.toStringAsFixed(1)),
        'neatLevel': _neatLevel,
        'fitnessGoal': _fitnessGoal,
        'fitnessLevel': _fitnessLevel,
        'medicalConditions': conditions,
        'customMedicalCondition': customText.isEmpty ? null : customText,
      });

      final newCalGoal = updatedUser.profile?.dailyCalorieGoal;
      if (newCalGoal != null) {
        await ref
            .read(dailyNutritionProvider.notifier)
            .updateCalorieGoal(newCalGoal);
      }

      ref.invalidate(dailyAnalyticsProvider);
      ref.invalidate(weeklyAnalyticsProvider);

      if (mounted) {
        if (context.canPop()) {
          context.pop();
        } else {
          context.go('/dashboard');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSaving = false;
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isAlreadyCompleted =
        ref.watch(authStateProvider).user?.profile?.onboardingCompleted == true;

    return PopScope(
      canPop: isAlreadyCompleted,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.background,
          elevation: 0,
          automaticallyImplyLeading: isAlreadyCompleted,
          titleSpacing: 20,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'LANGKAH ${_currentStep + 1} DARI 4',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                  color: AppColors.primary,
                ),
              ),
              Text(
                'Personalisasi Biometrik',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.onSurface,
                ),
              ),
            ],
          ),
        ),
        body: SafeArea(
          child: Column(
            children: [
              // Progress pill bar
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                child: Row(
                  children: List.generate(4, (idx) {
                    final active = idx <= _currentStep;
                    return Expanded(
                      child: Container(
                        height: 6,
                        margin: EdgeInsets.only(right: idx < 3 ? 6 : 0),
                        decoration: BoxDecoration(
                          color: active
                              ? AppColors.primary
                              : AppColors.surfaceContainerHigh,
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(14),
                          margin: const EdgeInsets.only(bottom: 14),
                          decoration: BoxDecoration(
                            color: AppColors.errorContainer,
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(
                              color: AppColors.onErrorContainer,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                      if (_currentStep == 0) _buildStep1BodyMetrics(),
                      if (_currentStep == 1) _buildStep2NeatAndGoal(),
                      if (_currentStep == 2) _buildStep3MedicalConditions(),
                      if (_currentStep == 3) _buildStep4PlanPreview(),
                    ],
                  ),
                ),
              ),
              // Bottom Navigation Buttons
              Container(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  border: Border(
                    top: BorderSide(
                      color: AppColors.outlineVariant.withValues(alpha: 0.25),
                    ),
                  ),
                ),
                child: Row(
                  children: [
                    if (_currentStep > 0) ...[
                      Expanded(
                        flex: 1,
                        child: OutlinedButton(
                          onPressed: _isSaving
                              ? null
                              : () => setState(() => _currentStep--),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 15),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(18),
                            ),
                          ),
                          child: const Text(
                            'Kembali',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      flex: 2,
                      child: FilledButton(
                        onPressed: _isSaving
                            ? null
                            : () {
                                if (_currentStep < 3) {
                                  setState(() => _currentStep++);
                                } else {
                                  _submitOnboarding();
                                }
                              },
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        child: _isSaving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                _currentStep < 3
                                    ? 'Lanjut'
                                    : 'Simpan & Aktifkan Target',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 14.5,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBentoCard({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(28),
        boxShadow: AppColors.bentoShadow,
        border: Border.all(
          color: AppColors.outlineVariant.withValues(alpha: 0.25),
        ),
      ),
      child: child,
    );
  }

  Widget _buildStep1BodyMetrics() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Profil Fisik Dasar',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        const Text(
          'Data ini menghitung kebutuhan kalori basal (BMR), batas hidrasi, serta kalori terbakar saat berolahraga.',
          style: TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
        ),
        const SizedBox(height: 18),
        _buildBentoCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Jenis Kelamin',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _buildGenderTile(
                      label: 'Pria',
                      icon: Icons.male_rounded,
                      selected: _gender == 'MALE',
                      onTap: () => setState(() => _gender = 'MALE'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildGenderTile(
                      label: 'Wanita',
                      icon: Icons.female_rounded,
                      selected: _gender == 'FEMALE',
                      onTap: () => setState(() => _gender = 'FEMALE'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _buildSliderHeader('Usia', '$_age Tahun'),
              Slider(
                value: _age.toDouble(),
                min: 14,
                max: 80,
                divisions: 66,
                activeColor: AppColors.primary,
                onChanged: (v) => setState(() => _age = v.round()),
              ),
              const SizedBox(height: 12),
              _buildSliderHeader(
                  'Tinggi Badan', '${_heightCm.toStringAsFixed(0)} cm'),
              Slider(
                value: _heightCm,
                min: 130,
                max: 215,
                divisions: 85,
                activeColor: AppColors.primary,
                onChanged: (v) => setState(() => _heightCm = v.roundToDouble()),
              ),
              const SizedBox(height: 12),
              _buildSliderHeader(
                  'Berat Badan', '${_weightKg.toStringAsFixed(1)} kg'),
              Slider(
                value: _weightKg,
                min: 35,
                max: 160,
                divisions: 250,
                activeColor: AppColors.primary,
                onChanged: (v) => setState(
                  () => _weightKg = (v * 2).round() / 2.0,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        // Live BMI badge
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.secondaryFixed.withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: AppColors.primary.withValues(alpha: 0.2),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.monitor_weight_outlined,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'ESTIMASI INDEKS MASSA TUBUH (BMI)',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.6,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${_bmi.toStringAsFixed(1)} • $_bmiLabel',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: AppColors.onSurface,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildGenderTile({
    required String label,
    required IconData icon,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary
              : AppColors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 20,
              color: selected ? Colors.white : AppColors.onSurfaceVariant,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: selected ? Colors.white : AppColors.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSliderHeader(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: AppColors.secondaryFixed.withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 12.5,
              color: AppColors.primary,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep2NeatAndGoal() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'NEAT & Tujuan Kebugaran',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        const Text(
          'NEAT (Non-Exercise Activity Thermogenesis) mengukur seberapa aktif Anda bergerak di luar jadwal olahraga.',
          style: TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        const Text(
          'Tingkat Aktivitas Harian (NEAT)',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5),
        ),
        const SizedBox(height: 10),
        ..._neatOptions.map((opt) {
          final isSelected = _neatLevel == opt.id;
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            child: InkWell(
              onTap: () => setState(() => _neatLevel = opt.id),
              borderRadius: BorderRadius.circular(22),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.secondaryFixed.withValues(alpha: 0.4)
                      : AppColors.surface,
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.outlineVariant.withValues(alpha: 0.25),
                    width: isSelected ? 1.8 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        opt.icon,
                        size: 20,
                        color: isSelected ? Colors.white : AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            opt.title,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 13.5,
                            ),
                          ),
                          Text(
                            opt.desc,
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        const SizedBox(height: 14),
        const Text(
          'Fokus Program Utama',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5),
        ),
        const SizedBox(height: 10),
        ..._goalOptions.map((opt) {
          final isSelected = _fitnessGoal == opt.id;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: () => setState(() => _fitnessGoal = opt.id),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.secondaryFixed.withValues(alpha: 0.35)
                      : AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : AppColors.outlineVariant.withValues(alpha: 0.25),
                    width: isSelected ? 1.8 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      opt.icon,
                      color: isSelected ? AppColors.primary : AppColors.outline,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            opt.title,
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 13.5,
                            ),
                          ),
                          Text(
                            opt.desc,
                            style: const TextStyle(
                              fontSize: 11.5,
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        const SizedBox(height: 14),
        const Text(
          'Level Kebugaran (Target Push-Up & Latihan)',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14.5),
        ),
        const SizedBox(height: 10),
        Row(
          children: _levelOptions.map((lvl) {
            final isSel = _fitnessLevel == lvl.id;
            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _fitnessLevel = lvl.id),
                child: Container(
                  margin: EdgeInsets.only(
                    right: lvl.id != 'ADVANCED' ? 8 : 0,
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 6),
                  decoration: BoxDecoration(
                    color: isSel ? AppColors.primary : AppColors.surface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: isSel
                          ? AppColors.primary
                          : AppColors.outlineVariant.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Column(
                    children: [
                      Text(
                        lvl.title,
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12.5,
                          color: isSel ? Colors.white : AppColors.onSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        lvl.sub,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 10,
                          color: isSel
                              ? Colors.white70
                              : AppColors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildStep3MedicalConditions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Kondisi Medis & Riwayat Kesehatan',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        const Text(
          'Pilih kondisi yang sesuai agar sistem menjaga target kalori, langkah, dan push-up tetap aman bagi tubuh Anda.',
          style: TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        _buildBentoCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Template Kondisi Umum (Bisa pilih lebih dari satu)',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilterChip(
                    label: const Text('Tidak Ada Keluhan'),
                    selected: _selectedConditions.isEmpty,
                    selectedColor:
                        AppColors.secondaryFixed.withValues(alpha: 0.7),
                    onSelected: (_) =>
                        setState(() => _selectedConditions.clear()),
                  ),
                  ..._conditionTemplates.map((item) {
                    final selected = _selectedConditions.contains(item.id);
                    return FilterChip(
                      label: Text(item.label),
                      selected: selected,
                      selectedColor:
                          AppColors.secondaryFixed.withValues(alpha: 0.7),
                      onSelected: (val) {
                        setState(() {
                          if (val) {
                            _selectedConditions.add(item.id);
                          } else {
                            _selectedConditions.remove(item.id);
                          }
                        });
                      },
                    );
                  }),
                ],
              ),
              const SizedBox(height: 20),
              const Text(
                'Kondisi Medis Spesifik Lainnya (Opsional)',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _customConditionCtrl,
                maxLines: 3,
                maxLength: 300,
                decoration: InputDecoration(
                  hintText:
                      'Misal: Pemulihan operasi ACL, GERD kronis, atau alergi olahraga dingin...',
                  filled: true,
                  fillColor: AppColors.surfaceContainerLow,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(18),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStep4PlanPreview() {
    final plan = _previewPlan();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Rencana Adaptif Anda Siap!',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        const Text(
          'Target harian di bawah ini dihitung khusus dari biometrik, NEAT, dan riwayat kesehatan Anda. Semua angka ini masih bisa Anda ubah kapan saja.',
          style: TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        _buildBentoCard(
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: _buildSummaryTile(
                      label: 'BMR Basal',
                      value: '${plan['bmr']} kkal',
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildSummaryTile(
                      label: 'TDEE Harian',
                      value: '${plan['tdee']} kkal',
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildTargetRow(
                icon: Icons.local_fire_department_rounded,
                color: const Color(0xFFD97706),
                label: 'Target Kalori Harian',
                value: '${plan['calories']} kkal/hari',
              ),
              const Divider(height: 22),
              _buildTargetRow(
                icon: Icons.water_drop_rounded,
                color: const Color(0xFF0284C7),
                label: 'Target Hidrasi Harian',
                value: '${plan['water']} ml/hari',
              ),
              const Divider(height: 22),
              _buildTargetRow(
                icon: Icons.directions_walk_rounded,
                color: AppColors.primary,
                label: 'Target Langkah Harian',
                value: '${plan['steps']} langkah',
              ),
              const Divider(height: 22),
              _buildTargetRow(
                icon: Icons.fitness_center_rounded,
                color: AppColors.tertiary,
                label: 'Minimum Push-Up Harian',
                value: '${plan['pushups']} repetisi',
              ),
              const Divider(height: 22),
              _buildTargetRow(
                icon: Icons.timer_rounded,
                color: AppColors.primaryContainer,
                label: 'Target Durasi Olahraga',
                value: '${plan['exerciseMinutes']} menit',
              ),
            ],
          ),
        ),
        if (plan['needsCap'] == true ||
            _customConditionCtrl.text.trim().isNotEmpty) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                color: const Color(0xFFD97706).withValues(alpha: 0.3),
              ),
            ),
            child: const Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.health_and_safety_rounded, color: Color(0xFFB45309)),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Guardrail Keamanan Medis Aktif: Intensitas langkah, push-up, dan defisit kalori telah diturunkan otomatis untuk menjaga kondisi tubuh Anda.',
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF78350F),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildSummaryTile({
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTargetRow({
    required IconData icon,
    required Color color,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 14,
            color: color,
          ),
        ),
      ],
    );
  }
}

