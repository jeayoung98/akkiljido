// 앱 전체의 루트 레이아웃. 온보딩과 메인 탭 화면을 최상위 Stack에 등록한다.
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
    // react-native-gesture-handler를 쓰려면 앱 최상단이 이걸로 감싸져 있어야 한다(특히 안드로이드에서 필수).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={DefaultTheme}>
          <Stack screenOptions={{ headerShown: false, statusBarStyle: 'dark' }}>
            <Stack.Screen name="landing" options={{ statusBarStyle: 'light' }} />
            <Stack.Screen name="login" />
            <Stack.Screen name="nickname-setup" />
            {/* 탭 화면은 상태바를 숨겨 화면 배경이 카메라 영역까지 자연스럽게 이어지도록 한다. */}
            <Stack.Screen name="(tabs)" options={{ statusBarHidden: true, statusBarTranslucent: true }} />
            {/* 알림함도 탭 화면처럼 초록 헤더가 카메라 영역까지 이어지는 화면이라 동일하게 처리한다. */}
            <Stack.Screen name="notifications" options={{ statusBarHidden: true, statusBarTranslucent: true }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
