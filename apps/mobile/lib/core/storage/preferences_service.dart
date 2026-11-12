import 'package:shared_preferences/shared_preferences.dart';

class PreferencesService {
  final SharedPreferences _prefs;

  PreferencesService(this._prefs);

  static const String _keyLanguage = 'selected_language';

  String get language => _prefs.getString(_keyLanguage) ?? 'id';

  Future<void> setLanguage(String langCode) async {
    await _prefs.setString(_keyLanguage, langCode);
  }

  bool get isIndonesian => language == 'id';
}

