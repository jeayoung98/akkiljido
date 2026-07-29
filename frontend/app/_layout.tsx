// 앱 전체의 루트 레이아웃. 온보딩과 메인 탭 화면을 최상위 Stack에 등록한다.
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// 앱 시작 시 최초로 보여줄 라우트를 랜딩 화면으로 지정한다.
export const unstable_settings = {
  initialRouteName: 'landing',
};

// 다크모드를 지원하지 않으므로 DefaultTheme로 고정한다.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack screenOptions={{ headerShown: false, statusBarStyle: 'dark' }}>
          <Stack.Screen name="landing" options={{ statusBarStyle: 'light' }} />
          <Stack.Screen name="login" />
          <Stack.Screen name="nickname-setup" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
