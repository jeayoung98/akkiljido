// 앱 전체의 루트 레이아웃. 온보딩과 메인 탭 화면을 최상위 Stack에 등록한다.
import { QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

// 앱이 백그라운드/헤드리스 상태로 시작돼도 위치 태스크가 먼저 등록되도록 루트에서 로드한다.
import '@/utils/backgroundLocationTask';
import { useReportPushHandler } from '@/hooks/useReportPushHandler';
import { queryClient } from '@/src/api/queryClient';

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
  // 리포트 푸시 알림 수신/탭 처리는 어느 화면에 있든 동작해야 하므로 루트에서 딱 한 번 등록한다.
  // (앱이 죽은 상태에서 알림을 눌러 실행된 경우도 여기서 함께 처리한다.)
  useReportPushHandler();

  return (
    // react-native-gesture-handler를 쓰려면 앱 최상단이 이걸로 감싸져 있어야 한다(특히 안드로이드에서 필수).
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* 서버에서 받아온 데이터의 캐시를 앱 전체가 공유하도록 최상단에서 한 번만 감싼다.
          이게 있어야 useQuery/useMutation을 쓰는 화면들이 같은 캐시를 보고,
          한 화면에서 수정한 결과가 다른 화면에도 반영된다. */}
      <QueryClientProvider client={queryClient}>
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
              {/* 마이페이지 하위 화면들도 배경이 카메라 영역까지 자연스럽게 이어지도록 동일하게 처리한다. */}
              <Stack.Screen name="notification-settings" options={{ statusBarHidden: true, statusBarTranslucent: true }} />
              <Stack.Screen name="settings" options={{ statusBarHidden: true, statusBarTranslucent: true }} />
            </Stack>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
