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
      emailVerified: json['emailVerified'] == true || json['email_verified'] == true,
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

  UserProfileModel({
    this.bio,
    this.primaryFocus = 'Optimal Sleep & Recovery',
    this.targetWakeTime = '06:45',
    this.targetSleepTime = '22:30',
    this.dailyWaterGoalMl = 2500,
    this.dailyStepsGoal = 10000,
    this.dailySleepGoalMinutes = 480,
    this.dailyExerciseGoalMinutes = 45,
  });

  factory UserProfileModel.fromJson(Map<String, dynamic> json) {
    return UserProfileModel(
      bio: json['bio']?.toString(),
      primaryFocus: json['primaryFocus']?.toString() ?? 'Optimal Sleep & Recovery',
      targetWakeTime: json['targetWakeTime']?.toString() ?? '06:45',
      targetSleepTime: json['targetSleepTime']?.toString() ?? '22:30',
      dailyWaterGoalMl: (json['dailyWaterGoalMl'] as num?)?.toInt() ?? 2500,
      dailyStepsGoal: (json['dailyStepsGoal'] as num?)?.toInt() ?? 10000,
      dailySleepGoalMinutes: (json['dailySleepGoalMinutes'] as num?)?.toInt() ?? 480,
      dailyExerciseGoalMinutes: (json['dailyExerciseGoalMinutes'] as num?)?.toInt() ?? 45,
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
      };
}

