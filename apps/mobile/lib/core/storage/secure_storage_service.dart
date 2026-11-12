import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  static const String _tokenKey = 'lifesync_auth_token';
  static const String _cookieKey = 'lifesync_session_cookie';
  static const String _userKey = 'lifesync_user_cache';

  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  Future<void> saveCookie(String cookie) async {
    await _storage.write(key: _cookieKey, value: cookie);
  }

  Future<String?> getCookie() async {
    return await _storage.read(key: _cookieKey);
  }

  Future<void> saveUserData(String jsonString) async {
    await _storage.write(key: _userKey, value: jsonString);
  }

  Future<String?> getUserData() async {
    return await _storage.read(key: _userKey);
  }

  Future<void> clearAuthData() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _cookieKey);
    await _storage.delete(key: _userKey);
  }
}

