class BiometricsSummaryModel {
  final double bmi;
  final String bmiCategory;
  final int bmr;
  final int tdee;
  final double neatMultiplier;
  final int dailyCalorieGoal;
  final int proteinGrams;
  final int carbsGrams;
  final int fatGrams;
  final int dailyWaterGoalMl;
  final int dailyStepsGoal;
  final int dailyExerciseGoalMinutes;
  final int dailyPushupGoal;
  final List<String> advisories;

  const BiometricsSummaryModel({
    this.bmi = 22.5,
    this.bmiCategory = 'Normal',
    this.bmr = 1600,
    this.tdee = 2200,
    this.neatMultiplier = 1.55,
    this.dailyCalorieGoal = 2000,
    this.proteinGrams = 100,
    this.carbsGrams = 220,
    this.fatGrams = 60,
    this.dailyWaterGoalMl = 2500,
    this.dailyStepsGoal = 9500,
    this.dailyExerciseGoalMinutes = 45,
    this.dailyPushupGoal = 20,
    this.advisories = const [],
  });

  factory BiometricsSummaryModel.fromJson(Map<String, dynamic> json) {
    final macros = json['macroTargets'] as Map<String, dynamic>? ?? {};
    final rawAdvisories = json['advisories'] as List? ?? [];
    return BiometricsSummaryModel(
      bmi: (json['bmi'] as num?)?.toDouble() ?? 22.5,
      bmiCategory: json['bmiCategory']?.toString() ?? 'Normal',
      bmr: (json['bmr'] as num?)?.toInt() ?? 1600,
      tdee: (json['tdee'] as num?)?.toInt() ?? 2200,
      neatMultiplier: (json['neatMultiplier'] as num?)?.toDouble() ?? 1.55,
      dailyCalorieGoal: (json['dailyCalorieGoal'] as num?)?.toInt() ?? 2000,
      proteinGrams: (macros['proteinGrams'] as num?)?.toInt() ?? 100,
      carbsGrams: (macros['carbsGrams'] as num?)?.toInt() ?? 220,
      fatGrams: (macros['fatGrams'] as num?)?.toInt() ?? 60,
      dailyWaterGoalMl: (json['dailyWaterGoalMl'] as num?)?.toInt() ?? 2500,
      dailyStepsGoal: (json['dailyStepsGoal'] as num?)?.toInt() ?? 9500,
      dailyExerciseGoalMinutes:
          (json['dailyExerciseGoalMinutes'] as num?)?.toInt() ?? 45,
      dailyPushupGoal: (json['dailyPushupGoal'] as num?)?.toInt() ?? 20,
      advisories: rawAdvisories.map((e) => e.toString()).toList(),
    );
  }
}

class UserModel {
  final String id;
  final String name;
  final String email;
  final bool emailVerified;
  final String role;
  final String? image;
  final UserProfileModel? profile;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.emailVerified,
    required this.role,
    this.image,
    this.profile,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      emailVerified:
          json['emailVerified'] == true || json['email_verified'] == true,
      role: json['role']?.toString() ?? 'USER',
      image: json['image']?.toString(),
      profile: json['profile'] != null
          ? UserProfileModel.fromJson(json['profile'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'emailVerified': emailVerified,
        'role': role,
        'image': image,
        if (profile != null) 'profile': profile!.toJson(),
      };
}

class UserProfileModel {
  final String? bio;
  final String primaryFocus;
  final String targetWakeTime;
  final String targetSleepTime;
  final int dailyWaterGoalMl;
  final int dailyStepsGoal;
  final int dailySleepGoalMinutes;
  final int dailyExerciseGoalMinutes;
  final int dailyCalorieGoal;
  final int dailyPushupGoal;
  final bool onboardingCompleted;
  final bool isAutoCalculated;
  final String gender;
  final int age;
  final double weightKg;
  final double heightCm;
  final String neatLevel;
  final String fitnessGoal;
  final String fitnessLevel;
  final List<String> medicalConditions;
  final String? customMedicalCondition;
  final BiometricsSummaryModel? biometrics;

  UserProfileModel({
    this.bio,
    this.primaryFocus = 'Optimal Sleep & Recovery',
    this.targetWakeTime = '06:45',
    this.targetSleepTime = '22:30',
    this.dailyWaterGoalMl = 2500,
    this.dailyStepsGoal = 10000,
    this.dailySleepGoalMinutes = 480,
    this.dailyExerciseGoalMinutes = 45,
    this.dailyCalorieGoal = 2000,
    this.dailyPushupGoal = 20,
    this.onboardingCompleted = false,
    this.isAutoCalculated = true,
    this.gender = 'MALE',
    this.age = 25,
    this.weightKg = 65.0,
    this.heightCm = 170.0,
    this.neatLevel = 'MODERATE',
    this.fitnessGoal = 'MAINTENANCE',
    this.fitnessLevel = 'BEGINNER',
    this.medicalConditions = const [],
    this.customMedicalCondition,
    this.biometrics,
  });

  factory UserProfileModel.fromJson(Map<String, dynamic> json) {
    final rawConditions = json['medicalConditions'] as List? ?? [];
    return UserProfileModel(
      bio: json['bio']?.toString(),
      primaryFocus:
          json['primaryFocus']?.toString() ?? 'Optimal Sleep & Recovery',
      targetWakeTime: json['targetWakeTime']?.toString() ?? '06:45',
      targetSleepTime: json['targetSleepTime']?.toString() ?? '22:30',
      dailyWaterGoalMl: (json['dailyWaterGoalMl'] as num?)?.toInt() ?? 2500,
      dailyStepsGoal: (json['dailyStepsGoal'] as num?)?.toInt() ?? 10000,
      dailySleepGoalMinutes:
          (json['dailySleepGoalMinutes'] as num?)?.toInt() ?? 480,
      dailyExerciseGoalMinutes:
          (json['dailyExerciseGoalMinutes'] as num?)?.toInt() ?? 45,
      dailyCalorieGoal: (json['dailyCalorieGoal'] as num?)?.toInt() ?? 2000,
      dailyPushupGoal: (json['dailyPushupGoal'] as num?)?.toInt() ?? 20,
      onboardingCompleted: json['onboardingCompleted'] == true,
      isAutoCalculated: json['isAutoCalculated'] != false,
      gender: json['gender']?.toString() ?? 'MALE',
      age: (json['age'] as num?)?.toInt() ?? 25,
      weightKg: (json['weightKg'] as num?)?.toDouble() ?? 65.0,
      heightCm: (json['heightCm'] as num?)?.toDouble() ?? 170.0,
      neatLevel: json['neatLevel']?.toString() ?? 'MODERATE',
      fitnessGoal: json['fitnessGoal']?.toString() ?? 'MAINTENANCE',
      fitnessLevel: json['fitnessLevel']?.toString() ?? 'BEGINNER',
      medicalConditions: rawConditions.map((e) => e.toString()).toList(),
      customMedicalCondition: json['customMedicalCondition']?.toString(),
      biometrics: json['biometrics'] is Map<String, dynamic>
          ? BiometricsSummaryModel.fromJson(
              json['biometrics'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'bio': bio,
        'primaryFocus': primaryFocus,
        'targetWakeTime': targetWakeTime,
        'targetSleepTime': targetSleepTime,
        'dailyWaterGoalMl': dailyWaterGoalMl,
        'dailyStepsGoal': dailyStepsGoal,
        'dailySleepGoalMinutes': dailySleepGoalMinutes,
        'dailyExerciseGoalMinutes': dailyExerciseGoalMinutes,
        'dailyCalorieGoal': dailyCalorieGoal,
        'dailyPushupGoal': dailyPushupGoal,
        'onboardingCompleted': onboardingCompleted,
        'isAutoCalculated': isAutoCalculated,
        'gender': gender,
        'age': age,
        'weightKg': weightKg,
        'heightCm': heightCm,
        'neatLevel': neatLevel,
        'fitnessGoal': fitnessGoal,
        'fitnessLevel': fitnessLevel,
        'medicalConditions': medicalConditions,
        'customMedicalCondition': customMedicalCondition,
      };
}
