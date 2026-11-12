import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:lifesync_mobile/app/app.dart';
import 'package:lifesync_mobile/core/network/api_client.dart';
import 'package:lifesync_mobile/core/storage/secure_storage_service.dart';
import 'package:lifesync_mobile/features/auth/data/auth_repository.dart';
import 'package:lifesync_mobile/features/auth/providers/auth_provider.dart';

class StubAuthNotifier extends AuthNotifier {
  StubAuthNotifier(super.repository);

  @override
  Future<void> checkAuthStatus() async {
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

void main() {
  testWidgets('LifeSyncApp launches successfully and displays Login', (WidgetTester tester) async {
    await initializeDateFormatting('id_ID', null);
    SharedPreferences.setMockInitialValues({});
    final sharedPreferences = await SharedPreferences.getInstance();

    final secureStorage = SecureStorageService();
    final apiClient = ApiClient(secureStorage: secureStorage);
    final repo = AuthRepository(apiClient: apiClient, secureStorage: secureStorage);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(sharedPreferences),
          authStateProvider.overrideWith((ref) => StubAuthNotifier(repo)),
        ],
        child: const LifeSyncApp(),
      ),
    );

    await tester.pumpAndSettle();

    // Verifies app launched and rendered LoginScreen cleanly
    expect(find.byType(LifeSyncApp), findsOneWidget);
    expect(find.text('LifeSync Wellness'), findsOneWidget);
  });
}
