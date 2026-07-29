// 앱 전체의 루트 레이아웃. 네비게이션 테마를 설정하고, (tabs) 화면을 최상위 Stack에 등록한다.
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import 'react-native-reanimated';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// 앱 시작 시 최초로 보여줄 라우트를 (tabs)로 지정
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// 루트 레이아웃 컴포넌트. 다크모드를 지원하지 않으므로 DefaultTheme로 고정하고,
// (tabs)를 Stack의 첫 화면으로 렌더링한다.
export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
