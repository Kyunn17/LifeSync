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

  Future<String?> _safeRead(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (_) {
      // Recover from corrupted Android KeyStore keys after reinstall/restore.
      try {
        await _storage.deleteAll();
      } catch (_) {}
      return null;
    }
  }

  Future<void> _safeWrite(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (_) {}
  }

  Future<void> _safeDelete(String key) async {
    try {
      await _storage.delete(key: key);
    } catch (_) {}
  }

  Future<void> saveToken(String token) => _safeWrite(_tokenKey, token);

  Future<String?> getToken() => _safeRead(_tokenKey);

  Future<void> saveCookie(String cookie) => _safeWrite(_cookieKey, cookie);

  Future<String?> getCookie() => _safeRead(_cookieKey);

  Future<void> saveUserData(String jsonString) =>
      _safeWrite(_userKey, jsonString);

  Future<String?> getUserData() => _safeRead(_userKey);

  Future<void> clearAuthData() async {
    await _safeDelete(_tokenKey);
    await _safeDelete(_cookieKey);
    await _safeDelete(_userKey);
  }
}

